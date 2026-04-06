# Dubbo-go-Pixiu 优化 cluster

## 背景：Pixiu 目前已有的并发优化

```txt
客户端
  -> 入口层
     accept / read / TLS / request body read
  -> 路由层
     path / method / header match
  -> 过滤器层
     auth / ratelimit / rewrite / transform / policy
  -> 上游层
     cluster pick -> conn pool -> dial/TLS -> RTT -> backend -> retry
  -> 回包层
     decode / transform / write / flush
  -> 客户端
```

Pixiu 不是没有性能基础，而是高并发优化目前主要集中在入口、路由、连接复用和保护性治理这几层，cluster 热路径还没有收紧。

### 1. 入口层已经具备基础抗压能力
- HTTP listener 直接使用 Go `http.Server`
- 已暴露 `ReadTimeout`、`WriteTimeout`、`IdleTimeout`、`MaxHeaderBytes`
- 这一层的目标是限制慢连接、慢请求和头部资源占用

对应实现：
- `pkg/listener/http/http_listener.go`

### 2. 请求上下文已经做了对象复用
- `HttpConnectionManager` 使用 `sync.Pool` 复用 `HttpContext`
- 这能降低高 QPS 下的小对象分配和 GC 压力

对应实现：
- `pkg/common/http/manager.go`

### 3. 路由层已经做成读优化路径
- 使用 `atomic` 快照保存路由视图
- 按 HTTP method 构建 Trie
- header regex 预编译并缓存
- 动态更新使用 debounce 合并，再原子切换快照

对应实现：
- `pkg/common/router/router.go`
- `pkg/model/router_snapshot.go`

### 4. 上游连接复用已经具备
- `httpproxy`、`llm/proxy` 复用 `http.Client`
- 暴露 `MaxIdleConns`、`MaxIdleConnsPerHost`、`MaxConnsPerHost`
- gRPC 新代理路径额外具备连接池、连接健康监控、descriptor cache、singleflight 去重

对应实现：
- `pkg/filter/http/httpproxy/routerfilter.go`
- `pkg/filter/llm/proxy/filter.go`
- `pkg/filter/network/grpcproxy/filter/proxy/grpc_proxy_filter.go`
- `pkg/filter/network/grpcproxy/filter/proxy/reflection_manager.go`

### 5. 保护性治理已经存在
- 健康检查会摘除不健康节点
- Sentinel 限流和熔断过滤器已经具备
- 这一层不是提升单请求速度，而是避免高并发下系统失控

对应实现：
- `pkg/cluster/healthcheck/healthcheck.go`
- `pkg/filter/sentinel/ratelimit/rate_limit.go`
- `pkg/filter/sentinel/circuitbreaker/circuit_breaker.go`

## 当前 cluster 热路径的问题

当前 cluster 路径的问题不在功能缺失，而在请求热路径仍有多余的查找、分配和共享状态写入：

### 1. `PickEndpoint()` 读路径仍然线性查找 cluster
- 先拿 `RLock`
- 再扫描 `store.Config` 按名字找 cluster
- cluster 数量增加后，这条路径会稳定成为热点

对应实现：
- `pkg/server/cluster_manager.go`

### 2. 健康节点过滤是每请求现算的
- `GetEndpoint(true)` 每次都会遍历 `Endpoints`
- 每次都会新建一个健康节点切片
- 这是典型的热路径额外分配

对应实现：
- `pkg/model/cluster.go`

### 3. RoundRobin 在共享配置对象上直接修改游标
- `PrePickEndpointIndex` 存在 `ClusterConfig` 上
- `RoundRobin` 直接修改它
- 但 `PickEndpoint()` 外层只拿了 `RLock`
- 这条并发模型不干净，也不适合作为高并发读路径

对应实现：
- `pkg/cluster/loadbalancer/roundrobin/round_robin.go`
- `pkg/server/cluster_manager.go`

### 4. 健康检查更新了状态，但没有维护健康节点快照
- 当前健康检查只修改 `endpoint.UnHealthy`
- 没有同步维护“健康节点只读快照”
- 所以请求路径只能每次重新过滤

对应实现：
- `pkg/cluster/healthcheck/healthcheck.go`

### 5. 多个 LB 实现都依赖 `GetEndpoint(true)`
- RoundRobin
- Rand
- WeightRandom
- RingHash
- Maglev

这意味着健康节点过滤和切片分配会在多个负载均衡算法里重复出现。

## 目标

在不改变外部配置和语义的前提下，优化 cluster 热路径：

- 将按名称查找 cluster 改为 O(1)
- 移除每请求健康节点切片分配
- 将 RR 游标改为并发安全的 runtime 状态
- 让健康状态变化立即反映到请求读路径
- 保持现有 YAML、LB 类型、控制面和健康检查语义不变

## 非目标

本次优化不做以下事情：

- 不新增新的负载均衡算法
- 不重构 listener、router、filter 三层
- 不修改 YAML 配置结构
- 不修改 xDS / control-plane 对外行为
- 不引入兼容层、双写、降级路径

## 推荐方案

### 核心思路
复用现有 `ClusterStore.clustersMap` 做 O(1) cluster 查找，不新增新的 manager 层；在现有 cluster 运行时对象上维护健康节点快照；各个 LB 直接读取快照；RoundRobin 游标移出共享配置写路径，改成并发安全的 runtime 状态。

### 方案拆解

#### 1. 复用现有 `clustersMap`
当前 `ClusterStore` 已经维护了 `clustersMap`，但请求热路径 `getCluster()` 仍然扫描 `store.Config`。

优化方向：
- `PickEndpoint()` 和 `PickNextEndpoint()` 改为直接命中 `store.clustersMap[name]`
- `store.Config` 继续保留给导出、控制面、遍历场景使用

#### 2. 引入健康节点快照
在 cluster runtime 上维护只读健康节点快照，而不是让请求路径临时过滤：
- cluster 初始化时构建一次健康节点快照
- `SetEndpoint()`、`DeleteEndpoint()`、`UpdateCluster()` 时刷新快照
- 健康检查状态变化时刷新快照
- 请求路径直接读取快照，不再调用 `GetEndpoint(true)` 生成临时切片

#### 3. RoundRobin 改为 runtime 并发安全游标
不要再在 `ClusterConfig` 上直接写 `PrePickEndpointIndex`。

优化方向：
- 将 RR 游标改成 runtime 状态
- 使用并发安全计数方式推进游标
- 请求读路径不再修改共享配置对象

#### 4. 统一 LB 读取健康快照
让以下 LB 全部直接消费健康快照：
- round robin
- random
- weight random
- ring hash
- maglev

这样可以一次性去掉这组算法里的重复过滤和额外分配。

## 实施计划

### 阶段 1：建立基线
目标：先量化当前 cluster 热路径成本，不带假设直接改。

工作项：
- 为 `PickEndpoint()` 增加 benchmark
- 为 `GetEndpoint(true)` 增加 benchmark
- 为 RoundRobin 并发访问增加 race test
- 记录优化前的 `ns/op`、`allocs/op`、`B/op`

建议新增文件：
- `pkg/server/cluster_manager_bench_test.go`
- `pkg/cluster/loadbalancer/roundrobin/round_robin_test.go`

验证：
- `go test ./pkg/server/... -bench PickEndpoint -benchmem`
- `go test ./pkg/cluster/loadbalancer/roundrobin/... -race`

### 阶段 2：将 cluster 查找改成 O(1)
目标：去掉按名字扫描 `store.Config` 的热路径。

工作项：
- 调整 `ClusterManager.getCluster()`，直接命中 `store.clustersMap`
- 复核 `AddCluster()`、`RemoveCluster()`、`UpdateCluster()`、`CompareAndSetStore()` 后 map 和 store 的一致性
- 保持 `store.Config` 不变，避免扩大影响面

修改文件：
- `pkg/server/cluster_manager.go`

验证：
- 原有 cluster manager 测试全部通过
- `PickEndpoint` benchmark 中 cluster 数增长后曲线更平滑

### 阶段 3：引入健康节点快照
目标：把健康节点过滤从请求路径移到状态变更路径。

工作项：
- 在 cluster runtime 上增加健康节点快照字段和刷新方法
- cluster 创建时初始化快照
- endpoint 增删改时刷新快照
- 提供只读获取接口，供 LB 直接消费

修改文件：
- `pkg/cluster/cluster.go`
- `pkg/server/cluster_manager.go`
- 如有必要，最小化调整 `pkg/model/cluster.go`

验证：
- 健康节点切换后，快照内容正确
- `GetEndpoint(true)` 不再出现在请求热路径
- 请求路径 `allocs/op` 显著下降

### 阶段 4：把健康检查接到快照刷新
目标：让健康状态变化立即反映到运行时选择结果。

工作项：
- 在 `handleHealth()` / `handleUnHealth()` 触发后刷新所属 cluster 的健康节点快照
- 保持原有 `endpoint.UnHealthy` 语义不变
- 不新增新的事件总线，不改健康检查主流程

修改文件：
- `pkg/cluster/healthcheck/healthcheck.go`
- `pkg/cluster/cluster.go`

验证：
- endpoint 从健康变为不健康后，不再被 `PickEndpoint()` 返回
- endpoint 恢复健康后，重新参与选择

### 阶段 5：清理 LB 热路径
目标：统一移除各个 LB 内部对 `GetEndpoint(true)` 的依赖。

工作项：
- RoundRobin 读取健康快照，并使用并发安全游标
- Rand 读取健康快照，并修正当前切片长度使用不一致的问题
- WeightRandom 读取健康快照
- RingHash / Maglev 读取健康快照
- 保持各算法对外行为不变

修改文件：
- `pkg/cluster/loadbalancer/roundrobin/round_robin.go`
- `pkg/cluster/loadbalancer/rand/load_balancer_rand.go`
- `pkg/cluster/loadbalancer/weightrandom/weight_random.go`
- `pkg/cluster/loadbalancer/ringhash/ring_hash.go`
- `pkg/cluster/loadbalancer/maglev/maglev_hash.go`

验证：
- 所有 LB 单测通过
- RR 在 `-race` 下不再报共享状态问题
- 各 LB 在健康节点变化时仍然返回有效节点

### 阶段 6：性能与正确性回归
目标：确认这次优化确实命中热点，而不是只移动代码位置。

工作项：
- 对比优化前后的 benchmark 结果
- 跑 `go test -race ./pkg/...`
- 对 cluster 数和 endpoint 数做分档 benchmark
- 观察 `PickEndpoint`、LB 路径上的 `allocs/op`

目标结果：
- `PickEndpoint()` 不再包含线性扫描
- 健康路径 `allocs/op` 接近 0
- RR 并发安全问题消失
- cluster 数量增长时吞吐下降更缓

## 预计改动文件

核心文件：
- `pkg/server/cluster_manager.go`
- `pkg/cluster/cluster.go`
- `pkg/model/cluster.go`
- `pkg/cluster/healthcheck/healthcheck.go`

LB 文件：
- `pkg/cluster/loadbalancer/roundrobin/round_robin.go`
- `pkg/cluster/loadbalancer/rand/load_balancer_rand.go`
- `pkg/cluster/loadbalancer/weightrandom/weight_random.go`
- `pkg/cluster/loadbalancer/ringhash/ring_hash.go`
- `pkg/cluster/loadbalancer/maglev/maglev_hash.go`

测试文件：
- `pkg/server/cluster_manager_bench_test.go`
- 与各 LB 对应的单测 / benchmark 文件

## 为什么这是最短正确路径

这份方案刻意没有扩大范围：

- 复用了已有 `clustersMap`，不再引入新的索引层
- 不修改 public config，不改 filter、router、listener 接口
- 健康节点快照放在现有 cluster 运行时对象上，符合当前仓库风格
- 直接命中 3 个热点：线性查找、每请求分配、共享游标写入

这也是当前 Pixiu cluster 层最值得优先做的一轮优化。