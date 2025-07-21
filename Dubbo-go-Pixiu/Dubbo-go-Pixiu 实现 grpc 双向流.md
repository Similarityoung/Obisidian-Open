---
title: Dubbo-go-Pixiu 实现 grpc 双向流
tags:
  - Dubbo
categories:
  - Gateway
date: 2025-05-27T21:54:03+08:00
draft: false
---
## 1. 引言

本文档旨在探讨在 `dubbo-go-pixiu` 网关中，基于现有的 `Http2ListenerService` 实现对原生 gRPC 流式传输（包括客户端流、服务端流和双向流）支持的几种设计方案。核心目标是使 Pixiu 能够接收来自 gRPC 客户端的流式请求，并利用 `grpcdynamic` 库动态地将这些请求代理到后端的 gRPC 服务。

## 2. 通用前提与核心组件

在讨论具体方案之前，我们明确以下通用前提和将要使用的核心组件：

- **Listener 配置**: Pixiu 网关配置了一个 `protocol_type: GRPC` 或 `protocol_type: HTTP2` 的 Listener。这将默认或间接使用 `Http2ListenerService` (位于 `pkg/listener/http2/http2_listener.go`) 来处理底层的 HTTP/2 连接。
    
- **`grpcdynamic` 库**: 用于在网关内部动态地构建和发送 gRPC 请求到后端服务，以及解析响应，无需预编译的 gRPC Stub。
    
- **方法描述符 (`desc.MethodDescriptor`)**: 网关需要有能力获取目标后端 gRPC 服务的方法描述符。这可以通过 gRPC 反射机制、在网关加载 `.proto` 文件或 `FileDescriptorSet` 文件，或通过其他配置服务来实现。
    
- **网络过滤器链 (`NetworkFilterChain`)**: 请求在 `Http2ListenerService` 接收后，会经过此处理链。我们需要在这里集成 gRPC 流处理逻辑。
    

## 3. 设计方案嵌入式标准 gRPC 服务器与 `grpc.UnknownServiceHandler`

### 3.1. 核心思想

修改 `Http2ListenerService`，使其内部的 `http.Server` 的 `Handler` 直接设置为一个标准的 `grpc.Server` 实例。这个嵌入的 `grpc.Server` 利用 `grpc.UnknownServiceHandler` 选项来捕获所有未在网关显式注册的 gRPC 服务调用，然后在其 Handler 内部使用 `grpcdynamic` 将这些调用动态代理到后端。

### 3.2. 工作流程

1. **Listener 初始化**:
    
    - 在 `Http2ListenerService` 启动时，不再使用通用的 `h2c.NewHandler(http.Handler, *http2.Server)`，而是创建一个 `grpc.Server` 实例。

2. **请求处理**:
    
    - 当一个 gRPC 客户端连接到此 Listener 并发起 RPC 调用时，请求直接由这个嵌入的 `grpcServer` 处理。

    - 由于没有服务被显式注册到 `grpcServer` 上，所有调用都会被路由到 `UnknownServiceHandler`。

3. **`UnknownServiceHandler` 函数**:

    - **解析请求**: 从 `serverStream.Context()` 和 `grpc.MethodFromServerStream(serverStream)` 获取完整方法名（如 `/package.Service/Method`）、元数据等。
        
    - **路由与服务发现**: 根据方法名中的服务部分，查询 Pixiu 路由配置，找到目标后端集群。
        
    - **获取方法描述符**: 获取目标方法的 `MethodDescriptor`。
        
    - **后端连接**: 获取到目标集群的 `grpc.ClientConn`。

### 3.3. 伪代码

#### 3.3.1 grpc_proxy_filter.go 与后端建立连接

```pseudocode
// -----------------------------------------------------------------
// grpc_proxy_filter.go 的伪代码表示
// -----------------------------------------------------------------

// 定义 Filter 结构体，它包含配置和一个用于缓存后端连接的池子
FILTER GrpcProxyFilter {
    Config: Filter配置 // (例如超时时间等)
    ConnectionPool: 线程安全的Map // (键: 后端地址, 值: gRPC连接)
    Mutex: 读写锁 // (用于保护连接池的创建操作)
}

// 1. Handle - 过滤器的主入口函数
FUNCTION Handle(请求上下文):
    // 从请求上下文中获取路由结果，确定要去哪个集群
    目标集群 = 请求上下文.路由信息.集群名

    // 从集群中选择一个健康的后端服务地址
    后端地址 = 集群管理器.选择一个后端(目标集群)

    // 调用流处理函数，并传入后端地址
    RETURN handleStream(请求上下文, 后端地址)
END FUNCTION


// 2. handleStream - 核心的流处理函数
FUNCTION handleStream(请求上下文, 后端地址):
    // 从连接池获取或创建一个到后端的长连接
    后端连接 = getOrCreateConnection(后端地址)
    IF 后端连接 IS NULL:
        设置请求错误("获取后端连接失败")
        RETURN 停止处理

    // 使用后端连接，创建一个通向后端的新gRPC流
    // (关键点: 强制使用 "passthrough" 编解码器，只传递原始字节)
    后端流 = 后端连接.创建新流(使用Passthrough编解码器)

    // 启动两个goroutine，实现双向数据转发
    START GOROUTINE forward(FROM=请求上下文.客户端流, TO=后端流)
    START GOROUTINE forward(FROM=后端流, TO=请求上下文.客户端流)

    // 等待两个转发任务完成，并处理可能发生的错误
    等待所有goroutine结束

    RETURN 继续处理
END FUNCTION


// 3. getOrCreateConnection - 连接池管理
FUNCTION getOrCreateConnection(后端地址):
    // --- 乐观锁定路径 ---
    // 首先，不加锁，尝试从连接池中读取连接
    连接 = ConnectionPool.Get(后端地址)
    IF 连接存在 AND 连接是健康的:
        日志("复用已有连接")
        RETURN 连接

    // --- 悲观锁定路径 ---
    // 如果没有找到或连接不健康，则获取一个写锁，准备创建新连接
    获取写锁()
    DEFER 释放写锁() // 确保函数结束时释放锁

    // 双重检查：在等待锁的过程中，可能有其他goroutine已经创建了连接
    连接 = ConnectionPool.Get(后端地址)
    IF 连接存在 AND 连接是健康的:
        RETURN 连接

    // 确定需要创建新连接
    日志("创建到 %s 的新连接", 后端地址)
    新连接 = createConnection(后端地址)
    
    // 将新连接存入池中
    ConnectionPool.Set(后端地址, 新连接)

    // 为新连接启动一个独立的健康检查监控
    START GOROUTINE monitorConnection(新连接, 后端地址)

    RETURN 新连接
END FUNCTION


// 4. monitorConnection - 单个连接的健康检查器
FUNCTION monitorConnection(连接, 地址):
    // 创建一个每30秒触发一次的定时器
    定时器 = 每30秒的Ticker

    LOOP FOREVER:
        等待定时器触发
        连接状态 = 连接.获取当前状态()
        
        // 如果连接已关闭或出现故障
        IF 连接状态 IS "Shutdown" OR "TransientFailure":
            日志("连接 %s 状态异常，从池中移除", 地址)
            获取写锁()
            ConnectionPool.Delete(地址)
            释放写锁()
            BREAK // 结束监控
END FUNCTION


// 5. Close - 过滤器关闭时的清理逻辑
FUNCTION Close():
    日志("开始关闭所有后端连接...")
    
    // 遍历连接池中的所有连接
    FOREACH 连接 IN ConnectionPool:
        // 安全地关闭每一个连接
        连接.关闭()

    日志("所有连接已关闭")
END FUNCTION
```

#### 3.3.2 grpc_listener.go 新建一个监听器来监听请求

```pseudocode
// -----------------------------------------------------------------
// grpc_listener.go 的伪代码表示
// -----------------------------------------------------------------

// 定义 GrpcListenerService 结构体，它包含一个gRPC服务器实例和监听器
LISTENER GrpcListenerService {
    Server: gRPC 服务器实例
    Listener: 网络监听器 (例如 net.Listener)
    FilterChain: 网络过滤器链
    ShutdownConfig: 优雅关闭的配置和状态
    CloseOnce: 保证清理逻辑只执行一次的工具
}

// 1. newGrpcListenerService - 创建和初始化监听器
FUNCTION newGrpcListenerService(监听器配置):
    // 根据配置创建网络过滤器链 (NetworkFilterChain)
    过滤器链 = 创建过滤器链(配置.过滤器)

    // 创建 GrpcListenerService 实例
    ls = NEW GrpcListenerService(过滤器链)

    // *** 关键配置 ***
    // 构建 gRPC 服务器的选项
    // 1. 强制使用 "passthrough" 编解码器，让服务器不解析消息体，只传递字节
    // 2. 将所有未注册服务（即所有服务）的处理器指向 proxyStreamHandler
    服务器选项 = [
        强制编解码器(PassthroughCodec),
        未知服务处理器(ls.proxyStreamHandler)
    ]

    // 创建 gRPC 服务器实例
    ls.Server = 新建gRPC服务器(服务器选项)

    // (注册 reflection 服务，用于调试)
    注册Reflection服务(ls.Server)

    RETURN ls
END FUNCTION


// 2. Start - 启动监听器
FUNCTION Start():
    // 根据配置的地址，开始在网络上监听
    ls.Listener = 监听TCP(地址)
    IF 监听失败:
        RETURN 错误

    // 启动一个 goroutine 来运行 gRPC 服务器，使其不阻塞主线程
    START GOROUTINE ls.serveGrpc(ls.Listener)

    日志("gRPC 监听器在 %s 启动成功", 地址)
    RETURN NIL
END FUNCTION


// 3. proxyStreamHandler - 所有 gRPC 请求的统一入口
FUNCTION proxyStreamHandler(任何服务, gRPC流):
    // 记录请求开始时间，用于计算耗时
    开始时间 = 当前时间

    // 从流中获取完整的 gRPC 方法名 (例如 /package.Service/Method)
    方法名 = gRPC.获取方法名(gRPC流)

    // 优雅关闭检查：如果正在关闭，则拒绝新请求
    IF ls.正在关闭():
        RETURN "服务器正在关闭" 的错误

    // 增加活跃请求计数
    ls.ShutdownConfig.活跃数++
    DEFER ls.ShutdownConfig.活跃数-- // 确保函数结束时减少计数

    // 将原生的 gRPC 流包装成我们自己的 RPCStream 接口类型
    自定义流 = NEW RPCStreamImpl(原始gRPC流)

    // 创建一个包含方法名等信息的流信息对象
    流信息 = NEW RPCStreamInfo(方法名)

    // *** 关键调用 ***
    // 将包装后的流和信息交给过滤器链处理
    错误 = ls.FilterChain.OnStreamRPC(自定义流, 流信息)

    // 记录请求耗时和结果
    日志("请求 %s 完成，耗时 %v", 方法名, 耗时)

    RETURN 错误
END FUNCTION


// 4. ShutDown / Close - 关闭和清理
FUNCTION ShutDown(等待组):
    日志("开始优雅关闭...")
    
    // 1. 标记为拒绝新请求
    ls.ShutdownConfig.拒绝请求 = TRUE

    // 2. 在超时时间内，等待所有活跃请求处理完毕
    等待活跃请求归零(超时时间)

    // 3. 优雅地停止 gRPC 服务器（会等待已有 stream 完成）
    ls.Server.GracefulStop()

    // 4. 调用通用的清理函数，确保资源被释放
    ls.cleanup()

    日志("优雅关闭完成")
END FUNCTION

FUNCTION Close():
    日志("强制关闭...")
    
    // 立即停止 gRPC 服务器，中断所有连接
    ls.Server.Stop()

    // 调用通用的清理函数
    ls.cleanup()
END FUNCTION

FUNCTION cleanup():
    // 使用 CloseOnce 确保以下逻辑只执行一次
    ls.CloseOnce.Do(FUNCTION:
        // 关闭过滤器链（这会触发 GrpcProxyFilter 的 Close，从而关闭所有后端连接）
        ls.FilterChain.Close()
    )
END FUNCTION
```

| **特性**     | **HTTP/HTTPS 监听服务**          | **HTTP/2 监听服务**                        | **设计原因分析**                        |
| ---------- | ---------------------------- | -------------------------------------- | --------------------------------- |
| **协议支持**   | HTTP/1.1 + HTTPS (TLS)       | HTTP/2 over cleartext (h2c)            | HTTP/2服务专注于明文HTTP/2场景，适用于内部安全网络环境 |
| **优雅关闭机制** | 连接级关闭 (http.Server.Shutdown) | **请求级关闭** (主动计数+拒绝机制)                  | HTTP/2多路复用特性需要更细粒度的请求控制           |
| **架构设计**   | 直接处理模式                       | **双重包装器架构** (h2cWrapper+handleWrapper) | 适配HTTP/2的h2c处理模型                  |
| **TLS支持**  | 完整autocert集成                 | 无TLS支持                                 | 保持HTTP/2服务的轻量性，专注h2c场景            |
| **活跃请求跟踪** | 无                            | **精确计数** (AddActiveCount)              | 实现请求级优雅关闭的必要条件                    |
| **错误处理**   | 标准HTTP错误                     | **专用拒绝响应** (503错误)                     | 明确区分正常关闭和拒绝状态                     |

## 4.  代码结构

```txt
pkg
├── common
│   └── codec
│       └── grpc
│           └── passthrough
│               └── codec.go                (透传编解码器，代理核心技术)
├── context
│   └── grpc
│       └── context.go                    (gRPC 请求上下文定义)
├── filter
│   └── network
│       └── grpcproxy
│           ├── filter
│           │   └── proxy
│           │       └── grpc_proxy_filter.go  (代理核心逻辑实现)
│           ├── grpc_filter_manager.go      (gRPC 过滤器管理器)
│           ├── grpc_manager.go             (gRPC 连接管理器和过滤器链调用)
│           └── plugin.go                   (gRPC 代理网络过滤器的插件化入口)
├── listener
│   └── grpc
│       └── grpc_listener.go              (gRPC 监听器和请求入口)
└── model
    └── stream.go                       (RPC 流的核心接口定义)
```

本次修改主要增加了 grpc_listener 和 grpc_filter，并且将networkfilterchain 中多添加了两个方法，OnUnaryRPC 和 OnStreamRPC ，这两个方法用于实现 rpc 框架下面的流式调用和一元调用（目前grpc 的处理方式是一元调用为特殊的流式调用，所以并未采用OnUnaryRPC）

## 5. 主要工作

当前的 gRPC 代理实现是一个占位符，不具备实际的代理能力，特别是对于流式 RPC。它无法处理未知的 Protobuf 消息类型，也缺少健壮的连接管理和优雅的生命周期控制。

此 PR 旨在将 Pixiu 实现为一个功能完整、健壮且高效的 gRPC 透明代理，能够处理所有类型的 gRPC 调用（一元、流式），并为未来的功能扩展打下坚实基础。

### 5.1 核心代理功能实现

- 实现 Passthrough 编解码器: 为了解决代理不认识消息体的问题，我们实现了一个自定义的 grpc.Codec，它将所有消息都作为原始字节 ([]byte) 对待，从而跳过 Protobuf 的编解码过程，实现了真正的“透传”代理。

- 统一流处理器: 通过 grpc.UnknownServiceHandler 将所有 gRPC 请求（无论类型）都导向一个统一的流处理器。该处理器会建立一个到后端的全双工流，并在客户端和后端之间透明地转发数据。请求处理链路如下：

> 客户端 -> GrpcListener -> GrpcProxyConnectionManager -> GrpcProxyFilter -> 后端服务

### 5.2 健壮性与生命周期管理

- 后端连接池与健康检查: 为后端连接实现了带锁的连接池 (sync.Map) 和复用机制，并增加了后台 goroutine 来监控连接健康状况，自动移除失效连接。

- 实现优雅关闭: 对框架进行了扩展，为 GrpcFilter 接口添加了 Close() 方法，并在网关关闭时（Close/ShutDown）安全地关闭所有后端连接和资源，防止泄露。通过 sync.Once 确保清理操作的幂等性。

### 5.3 代码质量与可维护性提升

- 全面重构: 对 grpc_listener, grpc_manager, grpc_proxy_filter 等核心文件进行了重构，将庞大的函数拆分为职责单一的小函数，大幅提升了代码可读性。