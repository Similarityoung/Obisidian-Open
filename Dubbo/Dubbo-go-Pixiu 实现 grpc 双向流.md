---
title: Dubbo-go-Pixiu 实现 grpc 双向流
tags:
  - Dubbo
categories:
  - Gateway
date: 2025-05-27T21:54:03+08:00
draft: true
---
## 1. 引言

本文档旨在探讨在 `dubbo-go-pixiu` 网关中，基于现有的 `Http2ListenerService` 实现对原生 gRPC 流式传输（包括客户端流、服务端流和双向流）支持的几种设计方案。核心目标是使 Pixiu 能够接收来自 gRPC 客户端的流式请求，并利用 `grpcdynamic` 库动态地将这些请求代理到后端的 gRPC 服务。

## 2. 通用前提与核心组件

在讨论具体方案之前，我们明确以下通用前提和将要使用的核心组件：

- **Listener 配置**: Pixiu 网关配置了一个 `protocol_type: GRPC` 或 `protocol_type: HTTP2` 的 Listener。这将默认或间接使用 `Http2ListenerService` (位于 `pkg/listener/http2/http2_listener.go`) 来处理底层的 HTTP/2 连接。
    
- **`grpcdynamic` 库**: 用于在网关内部动态地构建和发送 gRPC 请求到后端服务，以及解析响应，无需预编译的 gRPC Stub。
    
- **方法描述符 (`desc.MethodDescriptor`)**: 网关需要有能力获取目标后端 gRPC 服务的方法描述符。这可以通过 gRPC 反射机制、在网关加载 `.proto` 文件或 `FileDescriptorSet` 文件，或通过其他配置服务来实现。
    
- **网络过滤器链 (`NetworkFilterChain`)**: 请求在 `Http2ListenerService` 接收后，会经过此处理链。我们需要在这里集成 gRPC 流处理逻辑。
    

## 3. 设计方案

### 方案一：嵌入式标准 gRPC 服务器与 `grpc.UnknownServiceHandler`

#### 3.1. 核心思想

修改 `Http2ListenerService`，使其内部的 `http.Server` 的 `Handler` 直接设置为一个标准的 `grpc.Server` 实例。这个嵌入的 `grpc.Server` 利用 `grpc.UnknownServiceHandler` 选项来捕获所有未在网关显式注册的 gRPC 服务调用，然后在其 Handler 内部使用 `grpcdynamic` 将这些调用动态代理到后端。

#### 3.2. 工作流程

1. **Listener 初始化**:
    
    - 在 `Http2ListenerService` 启动时，不再使用通用的 `h2c.NewHandler(http.Handler, *http2.Server)`，而是创建一个 `grpc.Server` 实例。
        
    - `grpcServer := grpc.NewServer(grpc.UnknownServiceHandler(myDynamicGrpcProxyHandler))`
        
    - `Http2ListenerService` 内部的 `http.Server.Handler` 设置为这个 `grpcServer`。
        
2. **请求处理**:
    
    - 当一个 gRPC 客户端连接到此 Listener 并发起 RPC 调用时，请求直接由这个嵌入的 `grpcServer` 处理。
        
    - 由于没有服务被显式注册到 `grpcServer` 上，所有调用都会被路由到 `myDynamicGrpcProxyHandler`。
        
3. **`myDynamicGrpcProxyHandler` 函数**:
    
    - `func myDynamicGrpcProxyHandler(srv interface{}, serverStream grpc.ServerStream) error`
        
    - **解析请求**: 从 `serverStream.Context()` 和 `grpc.MethodFromServerStream(serverStream)` 获取完整方法名（如 `/package.Service/Method`）、元数据等。
        
    - **路由与服务发现**: 根据方法名中的服务部分，查询 Pixiu 路由配置，找到目标后端集群。
        
    - **获取方法描述符**: 获取目标方法的 `MethodDescriptor`。
        
    - **后端连接**: 获取到目标集群的 `grpc.ClientConn`。
        
    - **动态调用与流代理**:
        
        - 创建 `grpcdynamic.Stub`。
            
        - 根据 `MethodDescriptor` 判断流类型。
            
        - **关键流处理逻辑**: 在 `grpc.ServerStream` (代表客户端到网关的流) 和 `grpcdynamic.[StreamType]` (代表网关到后端的流) 之间双向泵送数据。
            
            - **客户端流**:
                
                - 调用 `stub.InvokeRpcClientStream()` 获得 `grpcdynamic.ClientStream` (gatewayToBackendStream)。
                    
                - 启动 goroutine 从 `serverStream.RecvMsg()` 读取客户端消息，通过 `gatewayToBackendStream.SendMsg()` 发送。
                    
                - 客户端发送完毕后 (`RecvMsg` 返回 `io.EOF`)，调用 `gatewayToBackendStream.CloseSend()`。
                    
                - 调用 `gatewayToBackendStream.CloseAndReceive()` 获取后端响应。
                    
                - 通过 `serverStream.SendMsg()` 将响应发回客户端。
                    
            - **服务端流**:
                
                - 从 `serverStream.RecvMsg()` 读取客户端的单个请求。
                    
                - 调用 `stub.InvokeRpcServerStream()` 获得 `grpcdynamic.ServerStream` (gatewayToBackendStream)。
                    
                - 启动 goroutine 从 `gatewayToBackendStream.RecvMsg()` 读取后端响应，通过 `serverStream.SendMsg()` 发回客户端。
                    
            - **双向流**: 结合上述两者，使用两个 goroutine 进行双向数据泵送。
                
            - **一元调用**: 简化版，收一个，发一个，再收一个，再发一个。
                
        - **元数据与错误处理**: 通过 `serverStream.SetHeader()`, `serverStream.SendHeader()`, `serverStream.SetTrailer()` 和返回的 `error` (可转换为 `status.Status`) 来处理与客户端的元数据和错误交互。同时处理与后端 `grpcdynamic` 流的元数据和错误。
            

#### 3.3. 伪代码 (针对双向流的核心代理逻辑)

```go
// func myDynamicGrpcProxyHandler(srv interface{}, clientToGatewayStream grpc.ServerStream) error
// ... 获取 methodDesc, backendConn, dynStub ...

if methodDesc.IsClientStreaming() && methodDesc.IsServerStreaming() {
    gatewayToBackendStream, err := dynStub.InvokeRpcBidiStream(clientToGatewayStream.Context(), methodDesc)
    if err != nil { return err }

    errChan := make(chan error, 2)

    // Client -> Gateway -> Backend
    go func() {
        defer gatewayToBackendStream.CloseSend() // 通知后端客户端流结束
        for {
            // 假设 msg 是从 clientToGatewayStream 正确读取的类型
            msg := dynamic.NewMessage(methodDesc.GetInputType()) // 或直接使用 clientToGatewayStream 的消息类型
            if err := clientToGatewayStream.RecvMsg(msg); err == io.EOF {
                errChan <- nil // 客户端正常关闭发送
                return
            } else if err != nil {
                errChan <- err
                return
            }
            if err := gatewayToBackendStream.SendMsg(msg); err != nil {
                errChan <- err
                return
            }
        }
    }()

    // Backend -> Gateway -> Client
    go func() {
        for {
            respMsg, err := gatewayToBackendStream.RecvMsg() // 已经是 proto.Message
            if err == io.EOF {
                errChan <- nil // 后端正常关闭发送
                return
            } else if err != nil {
                errChan <- err
                return
            }
            if err := clientToGatewayStream.SendMsg(respMsg); err != nil {
                errChan <- err
                return
            }
        }
    }()

    // 等待两个方向的流都结束或出错
    for i := 0; i < 2; i++ {
        if err := <-errChan; err != nil {
            // 可能需要更复杂的错误合并逻辑
            return err
        }
    }
    return nil
}
// ... 其他流类型的处理 ...
```

#### 3.4. 优劣分析

- **优点**:
    
    - **利用成熟 gRPC 库**: 网关与客户端之间的 gRPC 通信完全由 `grpc-go` 库处理，包括协议握手、帧处理、流控、头部/尾部元数据、错误状态等，非常健壮和标准。
        
    - **流处理接口清晰**: `grpc.ServerStream` 提供了标准的 `RecvMsg` 和 `SendMsg` 方法，与 `grpcdynamic` 的流接口可以非常自然地对接。
        
    - **实现相对简单**: 相比在 `http.Handler` 层面直接处理 gRPC 帧，此方案开发者不需要关心 HTTP/2 底层细节和 gRPC 协议的低级实现，专注于业务代理逻辑。
        
- **缺点**:
    
    - **Pixiu 过滤器链的集成挑战**: 一旦请求被 `grpc.Server` 接管，Pixiu 的标准 `NetworkFilterChain`（例如，包含 `HttpConnectionManager` 及其下的 `HttpFilter`）可能会被旁路。如果需要在 gRPC 调用级别应用 Pixiu 的通用过滤器（如认证、授权、限流、日志等），这些过滤器逻辑需要被适配并集成到 `myDynamicGrpcProxyHandler` 中，或者通过 `grpc.Server` 的拦截器 (Interceptor) 机制来实现。这可能需要对 Pixiu 的过滤模型进行调整或扩展。
        
    - **路由配置的适配**: Pixiu 的路由配置（`route_config`）通常是基于 HTTP Path、Header 等设计的。当处理原生 gRPC 请求时，需要将 gRPC 的服务名/方法名映射到这些路由规则上，或者 `myDynamicGrpcProxyHandler` 需要能直接访问和解释这些路由配置。
        

#### 3.1.5. 与 Pixiu 核心能力集成 (针对方案一：嵌入式标准 gRPC 服务器)

为了解决原生 gRPC 请求被 `grpc.Server` 接管后，Pixiu 传统过滤器链和路由机制可能被旁路的问题，可以考虑以下修改和集成策略：

- **路由集成**:
    
    - **在 `myDynamicGrpcProxyHandler` 中调用 Pixiu 路由逻辑**:
        
        - `myDynamicGrpcProxyHandler` 在解析出 gRPC 的 `fullMethod` (如 `/package.Service/Method`) 后，可以构造一个模拟的 HTTP 请求上下文（或者一个适配层），将此 `fullMethod` 映射为一个 Pixiu 能够理解的路径（例如，直接使用它或根据预定义规则转换）。
            
        - 调用 `server.GetRouterManager().RouteByPathAndName(adaptedPath, "GRPC")` (或类似方法，第二个参数表示请求类型) 来获取 Pixiu 的 `RouteAction`。
            
        - 这样，现有的基于路径匹配的路由规则（`route_config` 中的 `routes`）就可以被复用或适配。
            
        - `RouteAction` 中定义的 `cluster` 字段将用于确定后端的 gRPC 集群。
            
    - **扩展路由匹配条件**: 或者，可以考虑扩展 Pixiu 的 `RouterMatch` 结构，使其能够直接支持基于 gRPC 服务名和方法名的匹配，而不仅仅是 HTTP 路径前缀/精确匹配。
        
- **过滤器链集成**:
    
    - **手动执行过滤器链**:
        
        - 在 `myDynamicGrpcProxyHandler` 中，获取到目标 `RouteAction` 后，可以从关联的 Listener 配置或全局配置中查找应该应用于此 gRPC 调用的 Pixiu 过滤器链（例如，通过 `HttpConnectionManager` 配置的 `http_filters`，但需要适配）。
            
        - 创建一个适配的上下文对象 (类似于 `pch.HttpContext`，但针对 gRPC)，并手动遍历并执行这些过滤器。
            
        - 这要求 Pixiu 的 HTTP 过滤器能够处理这种适配的上下文，或者需要为 gRPC 调用设计一套并行的过滤器接口和实现。
            
        - 伪代码片段：
            
            ```
            // In myDynamicGrpcProxyHandler, after getting routeAction
            pixiuContext := createAdaptedGrpcContext(serverStream, routeAction) // 创建一个适配的上下文
            filterChain := getFilterChainForGrpcRoute(routeAction) // 获取适用于此 gRPC 路由的过滤器链
            
            // 执行 Decode 阶段的过滤器
            for _, filterFactory := range filterChain.HttpFilterFactories { // 假设过滤器工厂
                filter := filterFactory.PrepareFilterChain(pixiuContext) // 过滤器需要能处理适配的上下文
                status := filter.Decode(pixiuContext) // 执行 Decode
                if status == filter.Stop {
                    // 如果过滤器中止了请求，则直接返回错误给客户端
                    return sendErrorToClientStream(serverStream, pixiuContext.GetError())
                }
            }
            
            // ... 执行 grpcdynamic 调用 ...
            
            // 执行 Encode 阶段的过滤器 (如果需要对响应进行处理)
            // ...
            ```
            
    - **gRPC Interceptors**:
        
        - 在创建嵌入式 `grpc.Server` 时，可以注册 gRPC 服务器拦截器（Unary 和 Stream Interceptors）。
            
        - 这些拦截器可以被设计为 Pixiu 过滤器的包装器。当 gRPC 调用到达时，拦截器会触发相应的 Pixiu 过滤器逻辑。
            
        - 这需要将 Pixiu 过滤器的核心逻辑从其 HTTP 上下文依赖中解耦，使其更通用。
            
        - 例如，一个认证过滤器，其核心逻辑是验证 token，这个逻辑可以被 gRPC 拦截器调用，token 可以从 gRPC metadata 中获取。
            
        - 伪代码片段：
            
            ```
            // 创建 gRPC 服务器时
            opts := []grpc.ServerOption{
                grpc.UnaryInterceptor(pixiuUnaryServerInterceptor()),
                grpc.StreamInterceptor(pixiuStreamServerInterceptor()),
                grpc.UnknownServiceHandler(myDynamicGrpcProxyHandler),
            }
            grpcGatewayServer := grpc.NewServer(opts...)
            
            // 拦截器实现
            func pixiuUnaryServerInterceptor() grpc.UnaryServerInterceptor {
                return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
                    // 1. 从 info.FullMethod 获取服务和方法
                    // 2. 构造 Pixiu 上下文适配对象
                    // 3. 查找并执行 Pixiu 过滤器链的 Decode 部分
                    // 4. 如果过滤器允许，则调用 handler(ctx, req) -> 这会进入 myDynamicGrpcProxyHandler
                    // 5. 可能会有 Encode 阶段的过滤器处理响应 (gRPC 拦截器处理响应较复杂)
                    // ...
                }
            }
            ```
            
    - **混合模式**: 某些全局策略（如限流、基础日志）可以通过 gRPC 拦截器实现，而更复杂的、与路由相关的过滤器（如请求转换）则在 `myDynamicGrpcProxyHandler` 中，在路由决策之后、`grpcdynamic` 调用之前手动执行。
        
- **元数据和错误处理的集成**:
    
    - `myDynamicGrpcProxyHandler` 负责在 `grpc.ServerStream` 和 `grpcdynamic` 流之间正确传递元数据。Pixiu 过滤器可能需要读取或修改这些元数据（通过适配的上下文对象）。
        
    - 过滤器产生的错误或 `grpcdynamic` 调用产生的错误，都需要被 `myDynamicGrpcProxyHandler` 捕获，并转换为标准的 gRPC 错误状态返回给客户端。
        

### 方案二：基于 `TripleListenerService` 的扩展 (简述)

- **核心思想**: `TripleListenerService` (位于 `pkg/listener/triple/triple_listener.go`) 本身就是一个 gRPC/Triple 服务器。可以对其进行扩展，使其不仅能调用预定义的 Dubbo 服务，也能动态代理到任意 gRPC 后端。
    
- **工作流程**:
    
    1. 配置 `protocol_type: TRIPLE` 的 Listener。
        
    2. `TripleListenerService` 通过其内部的 `ProxyService` (或类似的机制) 处理 RPC 调用。
        
    3. **关键修改点**:
        
        - 在 `ProxyService.InvokeWithArgs` (用于一元和可能的客户端流起点) 或 Triple 库提供的服务器流处理回调中，增加逻辑来识别请求是否需要被动态代理到通用 gRPC 后端。
            
        - 如果是，则执行与方案一类似的步骤：获取方法描述符，连接后端，使用 `grpcdynamic` 建立流，并在 Triple 的服务器流抽象与 `grpcdynamic` 的客户端流抽象之间泵送数据。
            
- **优劣分析**:
    
    - **优点**:
        
        - 复用 `Triple` 协议栈，该协议栈设计上考虑了与 gRPC 的兼容性。
            
        - 可能与 Dubbo Triple 生态结合更紧密。
            
    - **缺点**:
        
        - 需要对 `dubbo-go/triple` 库有深入理解。
            
        - 将其扩展为通用 gRPC 代理可能偏离其主要设计目标，需要较多适配。
            
        - Pixiu 通用过滤器链与 `Triple` 库的拦截器机制的协调。
            

## 4. 通用考虑因素

对于以上所有方案，都需要考虑以下通用问题：

- **元数据 (Metadata) 处理**:
    
    - 入站 gRPC 请求的元数据需要被提取，并根据需要（例如路由、认证）进行处理。
        
    - 部分元数据可能需要透传或转换后传递给后端 `grpcdynamic` 调用。
        
    - 后端 `grpcdynamic` 调用返回的头部和尾部元数据也需要传递回原始客户端。
        
- **错误传播**:
    
    - 后端 `grpcdynamic` 调用产生的 gRPC 错误（`status.Status`）需要被捕获，并转换为对原始客户端的 gRPC 错误响应。
        
    - 网关自身产生的错误（如路由失败、连接后端失败）也需要以标准的 gRPC 错误形式返回。
        
- **路由与服务发现**:
    
    - 需要将 gRPC 的服务名和方法名有效地集成到 Pixiu 现有的路由匹配逻辑中。
        
    - `ClusterManager` 和服务发现机制需要能够为动态 gRPC 代理提供后端端点。
        
- **Pixiu 过滤器链集成**:
    
    - 理想情况下，Pixiu 的通用能力（如认证、授权、限流、日志、指标收集等过滤器）应该能够应用于这些动态代理的 gRPC 请求。这可能需要在选定的方案中找到合适的切入点来执行这些过滤器逻辑。
        

## 5. 结论与建议

- **方案一 (嵌入式 gRPC 服务器)** 在技术实现上，利用 `grpc-go` 库处理客户端连接，并与 `grpcdynamic` 对接后端，可能是最直接和健壮的方式来处理原生 gRPC 流。其主要挑战在于如何将 Pixiu 的路由和过滤器能力无缝集成到 `UnknownServiceHandler` 的流程中。这可能需要设计一种方式，让 `UnknownServiceHandler` 能够访问和执行 Pixiu 的路由决策和过滤器链。
    
- **方案二 (基于 TripleListenerService)** 对于主要服务于 Dubbo Triple 协议并希望扩展到通用 gRPC 代理的场景可能更合适，但通用性可能不如方案一。
    

**建议**: 优先考虑**方案一**，因为它能最大程度地复用现有的、经过充分测试的 `grpc-go` 库来处理复杂的 gRPC 协议细节。然后，重点解决如何在该方案中优雅地集成 Pixiu 的路由、服务发现和过滤器链能力。例如，`UnknownServiceHandler` 在做出路由决策后，可以构造一个内部的请求上下文，并手动执行匹配的 Pixiu 过滤器链，然后再通过 `grpcdynamic` 调用后端。

##### HTTP/HTTPS 与 HTTP2 核心差异对比

| **特性**     | **HTTP/HTTPS 监听服务**          | **HTTP/2 监听服务**                        | **设计原因分析**                        |
| ---------- | ---------------------------- | -------------------------------------- | --------------------------------- |
| **协议支持**   | HTTP/1.1 + HTTPS (TLS)       | HTTP/2 over cleartext (h2c)            | HTTP/2服务专注于明文HTTP/2场景，适用于内部安全网络环境 |
| **优雅关闭机制** | 连接级关闭 (http.Server.Shutdown) | **请求级关闭** (主动计数+拒绝机制)                  | HTTP/2多路复用特性需要更细粒度的请求控制           |
| **架构设计**   | 直接处理模式                       | **双重包装器架构** (h2cWrapper+handleWrapper) | 适配HTTP/2的h2c处理模型                  |
| **TLS支持**  | 完整autocert集成                 | 无TLS支持                                 | 保持HTTP/2服务的轻量性，专注h2c场景            |
| **活跃请求跟踪** | 无                            | **精确计数** (AddActiveCount)              | 实现请求级优雅关闭的必要条件                    |
| **错误处理**   | 标准HTTP错误                     | **专用拒绝响应** (503错误)                     | 明确区分正常关闭和拒绝状态                     |

# 目前流式设计的设计方案
## 1. 整体架构

### 1.1 核心组件

- GrpcContext: gRPC 请求上下文管理

- GrpcFilter: gRPC 过滤器接口

- GrpcConnectionManager: gRPC 连接管理器

- StreamConfig: 流式配置管理
### 1.2 目录结构

```
pkg/
├── context/
│   └── grpc/
│       └── context.go      # gRPC 上下文定义
├── common/
│   └── grpc/
│       ├── manager.go      # 连接管理器
│       └── RoundTripper.go # HTTP/2 转发器
├── model/
│   └── http.go            # 配置模型定义
└── common/extension/filter/
│   └── filter.go          # 过滤器接口定义
└──
```

```text
   客户端请求 -> gRPC Server -> UnknownServiceHandler -> dynamicGrpcProxyHandler
   -> FilterChain.OnGrpcStream -> 后端服务
```

