# Dubbo-go-Pixiu 优化 cluster

## 背景：Pixiu 已有的并发优化基础

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

Pixiu 不是没有性能基础，而是当前高并发优化主要集中在入口、路由、连接复用和保护性治理几层，cluster 热路径还没有被系统性收紧。

### 1. 入口层已经具备基础抗压能力
- HTTP listener 直接使用 Go `http.Server`
- 已暴露 `ReadTimeout`、`WriteTimeout`、`IdleTimeout`、`MaxHeaderBytes`
- 这一层的重点是限制慢连接、慢请求和头部资源占用

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
- 健康检查会通过 `endpoint.UnHealthy` 影响后续节点筛选
- Sentinel 限流和熔断过滤器已经具备
- 这一层的重点不是直接缩短单请求路径，而是避免高并发下系统失控

对应实现：
- `pkg/cluster/healthcheck/healthcheck.go`
- `pkg/filter/sentinel/ratelimit/rate_limit.go`
- `pkg/filter/sentinel/circuitbreaker/circuit_breaker.go`

## 审查后的关键结论

这份文档的主方向是对的，但有三个地方需要收紧，否则后续实现容易偏：

- `clustersMap` 可以复用，但不能直接把请求读路径切过去。当前 `store.Config` 和 `clustersMap` 已经形成双视图，`UpdateCluster()` 只替换了 `store.Config`，没有同步刷新 runtime cluster、健康检查器和一致性哈希状态。
- 健康节点快照值得做，但刷新责任必须显式落在 cluster runtime 上。现在 healthcheck 只会修改 `endpoint.UnHealthy`，没有现成的“回推快照刷新”边界。
- `RoundRobin` / `Rand` / `WeightRandom` 和 `RingHash` / `Maglev` 不能按同一种方式处理。前者可以直接吃健康快照，后者当前的哈希结构是按 endpoint 成员集构建的，首轮优化不应该把“健康变化即重建哈希结构”混进来。

## 当前 cluster 热路径的问题

当前问题不在于功能缺失，而在于请求热路径仍然承担了额外查找、切片分配、共享状态写入，以及部分边界正确性问题。

### 1. `store.Config` 与 `clustersMap` 已经形成双视图
- 请求读路径通过 `getCluster()` 扫描 `store.Config`
- endpoint 生命周期和 health checker 生命周期通过 `clustersMap` 驱动
- `UpdateCluster()` 当前只替换 `store.Config`，不会同步刷新 `clustersMap` 里的 runtime cluster
- 所以“直接改成走 map”之前，必须先收口这两份状态的一致性

对应实现：
- `pkg/server/cluster_manager.go`

### 2. `PickEndpoint()` 读路径仍然线性查找 cluster
- `PickEndpoint()` / `PickNextEndpoint()` 外层拿的是 `RLock`
- `getCluster()` 仍然逐个扫描 `store.Config`
- cluster 数量增加后，这条路径会稳定成为热点

对应实现：
- `pkg/server/cluster_manager.go`

### 3. 健康节点过滤是每请求现算的
- `GetEndpoint(true)` 每次都会遍历 `Endpoints`
- 每次都会新建一个健康节点切片
- 这是典型的热路径额外分配

对应实现：
- `pkg/model/cluster.go`

### 4. RoundRobin 在共享配置对象上直接修改游标
- `PrePickEndpointIndex` 存在 `ClusterConfig` 上
- `RoundRobin` 直接修改它
- `PickEndpoint()` 外层只有 `RLock`
- 当健康节点为空时，当前实现还存在空切片访问风险

这已经不只是性能问题，也是并发与边界正确性问题。

对应实现：
- `pkg/cluster/loadbalancer/roundrobin/round_robin.go`
- `pkg/server/cluster_manager.go`

### 5. 多个 LB 重复做健康过滤，而且部分实现已有边界漏洞
- `RoundRobin`、`Rand`、`WeightRandom`、`RingHash`、`Maglev` 都依赖 `GetEndpoint(true)`
- 这意味着健康过滤和切片分配会在多个负载均衡算法里重复出现
- `Rand` 当前使用 `len(c.Endpoints)-1` 作为随机上界，却去索引健康节点切片，健康节点数少于总节点数时有越界风险
- `RingHash` / `Maglev` 当前是先基于全量 endpoint 做哈希，再到健康节点里找目标，因此它们的语义需要单独保留，不能简单等同于“只读健康快照”

对应实现：
- `pkg/cluster/loadbalancer/rand/load_balancer_rand.go`
- `pkg/cluster/loadbalancer/weightrandom/weight_random.go`
- `pkg/cluster/loadbalancer/ringhash/ring_hash.go`
- `pkg/cluster/loadbalancer/maglev/maglev_hash.go`

## 目标

在不改变外部配置和核心语义的前提下，优化 cluster 热路径：

- 将按名称查找 cluster 改为 O(1)
- 移除请求热路径上的健康节点切片分配
- 将 RR 游标改为并发安全的 runtime 状态
- 让健康状态变化能够及时反映到请求读路径
- 保持现有 YAML、LB 类型、控制面和健康检查主语义不变
- 顺手补齐当前热路径上已经暴露出的空健康集合与随机索引边界问题

## 非目标

本次优化不做以下事情：

- 不新增新的负载均衡算法
- 不重构 listener、router、filter 三层
- 不修改 YAML 配置结构
- 不修改 xDS / control-plane 对外行为
- 不引入兼容层、双写、降级路径
- 不在首轮优化里把健康状态变化扩展为“一致性哈希结构实时重建”

## 推荐方案

### 核心思路
先收口 `store.Config` 与 runtime cluster 的一致性，再把请求路径切到 O(1) 查找；把健康节点筛选从请求路径移到状态变更路径；`RoundRobin` / `Rand` / `WeightRandom` 直接消费健康快照，`RingHash` / `Maglev` 保持当前哈希语义，只把健康判断从“现算切片”改成“读取快照”。

### 设计边界
- 继续复用现有 `ClusterStore -> clustersMap -> cluster.Cluster -> ClusterConfig` 组合，不新增新的 manager 层
- runtime 状态应沿用当前仓库已有落点，避免额外抽象；当前 `ClusterConfig` 本身已经承载了一部分 runtime 信息（例如一致性哈希对象），这次只做最小必要延展
- healthcheck 不反查全局 manager，也不引入事件总线；由所属 cluster runtime 提供最小刷新入口

### 方案拆解

#### 1. 先收口 `store.Config` 与 runtime cluster 一致性
`clustersMap` 不是不能用，而是不能在当前双视图不一致的前提下直接变成请求路径唯一数据源。

优化方向：
- 明确 `clustersMap[name]` 是请求路径的 runtime 入口
- `AddCluster()`、`UpdateCluster()`、`RemoveCluster()`、`CompareAndSetStore()` 必须同步维护 `store.Config` 和 runtime cluster
- `UpdateCluster()` 不能只替换 `store.Config` 中的指针，还要同步刷新对应 cluster 的 runtime 状态，包括健康检查器和一致性哈希对象
- 在一致性收口之后，再让 `PickEndpoint()` / `PickNextEndpoint()` 直接命中 `clustersMap`

#### 2. 引入健康节点快照，把过滤从请求路径移到状态变更路径
不要再让请求路径临时调用 `GetEndpoint(true)` 生成健康节点切片。

优化方向：
- 在现有 cluster runtime / config 组合上维护只读健康节点快照
- cluster 初始化时构建一次快照
- endpoint 增删改时刷新快照
- 请求路径直接读取快照，不再在热路径里重复分配切片

#### 3. 把 RR 游标改成并发安全的 runtime 状态
不要再在共享读路径里直接修改普通整数字段 `PrePickEndpointIndex`。

优化方向：
- 将 RR 游标移动到并发安全的 runtime 状态中
- 使用原子计数或等价方式推进游标
- 当健康快照为空时直接返回 `nil`
- 请求读路径不再修改共享配置对象上的普通字段

#### 4. 区分简单 LB 和一致性哈希 LB 的处理方式
这一步需要显式分开，不然很容易把“优化热路径”写成“改变算法语义”。

优化方向：
- `RoundRobin`、`Rand`、`WeightRandom` 直接读取健康快照
- `RingHash` / `Maglev` 首轮继续沿用当前基于 endpoint 成员集的哈希结构
- 一致性哈希族只把“健康判断”切到快照，不在健康状态变化时实时重建 ring / table
- 这样既能去掉热路径上的重复过滤和分配，也不会无意改掉当前一致性哈希的行为边界

#### 5. 让健康检查通过最小回调刷新快照
当前 healthcheck 只会写 `endpoint.UnHealthy`，还缺少把状态变化回推到 runtime 快照的边界。

优化方向：
- 在 cluster runtime 上提供一个最小刷新入口
- `handleHealth()` / `handleUnHealth()` 在修改 `endpoint.UnHealthy` 后触发所属 cluster 的快照刷新
- 不引入新的事件总线，不改健康检查主流程

## 实施计划

### 阶段 1：建立基线
目标：先量化当前 cluster 热路径成本，不带假设直接改。

工作项：
- 为 `PickEndpoint()` 增加 benchmark
- 为 `GetEndpoint(true)` 增加 benchmark
- 为 `RoundRobin` 并发访问增加 race test
- 为“无健康节点 / 部分健康节点”补充单测
- 记录优化前的 `ns/op`、`allocs/op`、`B/op`

建议新增文件：
- `pkg/server/cluster_manager_bench_test.go`
- `pkg/cluster/loadbalancer/roundrobin/round_robin_test.go`
- `pkg/cluster/loadbalancer/rand/load_balancer_rand_test.go`

验证：
- `go test ./pkg/server/... -bench PickEndpoint -benchmem`
- `go test ./pkg/cluster/loadbalancer/roundrobin/... -race`
- `go test ./pkg/cluster/loadbalancer/rand/...`

### 阶段 2：收口 runtime 一致性并切换 O(1) 查找
目标：先把 runtime 数据源收口，再去掉按名字扫描 `store.Config` 的热路径。

工作项：
- 调整 `ClusterManager` 的读路径，改为命中 `clustersMap`
- 补齐 `AddCluster()`、`UpdateCluster()`、`RemoveCluster()`、`CompareAndSetStore()` 对 runtime cluster 的同步维护
- 明确 `UpdateCluster()` 对健康检查器和一致性哈希对象的刷新策略
- 复核 xDS 和 spring cloud 这两条更新路径在新模型下仍然成立

修改文件：
- `pkg/server/cluster_manager.go`
- `pkg/cluster/cluster.go`

验证：
- 原有 cluster manager 相关测试全部通过
- xDS / spring cloud 相关用例不回归
- `PickEndpoint` benchmark 中 cluster 数增长后曲线更平滑

### 阶段 3：引入健康节点快照
目标：把健康节点过滤从请求路径移到状态变更路径。

工作项：
- 在 runtime 状态中增加健康节点快照字段和刷新方法
- cluster 创建时初始化快照
- endpoint 增删改时刷新快照
- 提供只读获取接口，供 LB 直接消费

修改文件：
- `pkg/cluster/cluster.go`
- `pkg/model/cluster.go`
- `pkg/server/cluster_manager.go`

验证：
- 健康节点切换后，快照内容正确
- 请求热路径不再依赖 `GetEndpoint(true)` 生成临时切片
- 请求路径 `allocs/op` 显著下降

### 阶段 4：把健康检查接到快照刷新
目标：让健康状态变化立即反映到运行时选择结果。

工作项：
- 为 healthcheck 增加最小回调或 owner 引用
- `handleHealth()` / `handleUnHealth()` 在更新 `endpoint.UnHealthy` 后触发快照刷新
- 保持原有健康检查主流程不变

修改文件：
- `pkg/cluster/healthcheck/healthcheck.go`
- `pkg/cluster/cluster.go`

验证：
- endpoint 从健康变为不健康后，不再被简单 LB 返回
- endpoint 恢复健康后，重新参与选择
- 健康状态变化后，请求路径无需等待下一次全量过滤

### 阶段 5：清理 LB 热路径与边界条件
目标：统一移除各个 LB 内部对 `GetEndpoint(true)` 的热路径依赖，并补齐当前边界问题。

工作项：
- `RoundRobin` 读取健康快照，并使用并发安全游标
- `Rand` 读取健康快照，并修正当前随机范围和空集合处理
- `WeightRandom` 读取健康快照
- `RingHash` / `Maglev` 保持现有哈希结构语义，只把健康判断切到快照
- 补齐“无健康节点”“部分健康节点”“一致性哈希目标节点不健康”相关测试

修改文件：
- `pkg/cluster/loadbalancer/roundrobin/round_robin.go`
- `pkg/cluster/loadbalancer/rand/load_balancer_rand.go`
- `pkg/cluster/loadbalancer/weightrandom/weight_random.go`
- `pkg/cluster/loadbalancer/ringhash/ring_hash.go`
- `pkg/cluster/loadbalancer/maglev/maglev_hash.go`

验证：
- 所有 LB 单测通过
- `RoundRobin` 在 `-race` 下不再报共享状态问题
- `Rand` 不再出现健康切片越界
- `RingHash` / `Maglev` 在健康节点变化时仍然返回有效节点，且不引入额外语义漂移

### 阶段 6：性能与正确性回归
目标：确认这次优化确实命中热点，而不是只移动代码位置。

工作项：
- 对比优化前后的 benchmark 结果
- 跑 `go test -race ./pkg/...`
- 对 cluster 数、endpoint 数、健康比例做分档 benchmark
- 观察 `PickEndpoint`、LB 路径上的 `allocs/op`

目标结果：
- `PickEndpoint()` 不再包含线性扫描
- 健康路径 `allocs/op` 接近 0
- RR 并发安全问题消失
- cluster 数量增长时吞吐下降更缓
- 无健康节点和部分健康节点场景不再触发 panic

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
- `pkg/cluster/loadbalancer/roundrobin/round_robin_test.go`
- `pkg/cluster/loadbalancer/rand/load_balancer_rand_test.go`
- 与 `WeightRandom`、`RingHash`、`Maglev` 对应的单测 / benchmark 文件

## 为什么这是最短正确路径

这份方案刻意没有扩大范围：

- 复用了已有 `clustersMap`，但先把 runtime 一致性收口，而不是带着双视图缺口直接切读路径
- 不修改 public config，不改 listener、router、filter 的边界
- 把健康节点过滤移到状态变更路径，直接命中热路径分配问题
- 把简单 LB 和一致性哈希 LB 分开处理，避免为了“统一”而引入语义漂移
- 在优化热路径的同时，顺手补掉当前已经存在的边界漏洞，而不是额外扩展需求

这也是当前 Pixiu cluster 层最值得优先做的一轮优化。
