---
title: issue： 双向流模式中 dubbo-go 无法关闭 Tcp 连接
tags:
  - issue
categories:
  - Dubbo
date: 2025-01-17T17:10:25+08:00
draft: false
---
### [issue 关联](https://github.com/apache/dubbo-go/discussions/2756)

> client: dubbo-go: v3.2.0-rc2  
> server: dubbo v3.3.0     
> registry: zookeeper

问题 1：biStream 客户端没有关闭长连接的接口；如果服务端不调用 onCompleted，那么 Receive 会永久 block

- 客户端应当具有主动 Close 能力才对，底层使用的是 grpc，而 grpc 客户端是能够主动关闭连接的。

问题 2：Java 服务端调用 onCompleted() 后，biStream.Receive 返回 EOF  

- 但是和服务端的 TCP 连接仍然存在；我知道 dubbo client 内部是连接池，但是我测试了一下，TCP 连接似乎并没有被复用

### 源码分析

```go
func TestBiDiStream2(svc greet.GreetService) error {  
    fmt.Printf("start to test triple bidi stream 2\n")  
    stream, err := svc.GreetStream(context.Background())  
    if err != nil {  
       return err  
    }  
    if sendErr := stream.Send(&greet.GreetStreamRequest{Name: "stream client!"}); sendErr != nil {  
       return err  
    }  
  
    resp, err := stream.Recv()  
    if err != nil {  
       return err  
    }  
    fmt.Printf("triple bidi stream2 resp: %s\n", resp.Greeting)  
    if err := stream.CloseRequest(); err != nil {  
       return err  
    }  
    if err := stream.CloseResponse(); err != nil {  
       return err  
    }  
    fmt.Printf("========>TestBiDiStream end, close stream...\n")  
    return nil  
}
```

在其中

```go
if err := stream.CloseRequest(); err != nil {  
       return err  
    }  
    if err := stream.CloseResponse(); err != nil {  
       return err  
    } 
```

1. 客户端调用 `CloseRequest()` 关闭请求部分，表示不再发送更多的请求。
    
2. 客户端调用 `CloseResponse()` 关闭响应部分，表示不再接收更多的响应。

下面从`closeRequest( )`开始进行源码分析

### closeRequest( )

 `CloseRequest` 方法的作用：**关闭流的发送端**。在双向流通信中，流的发送端用于客户端向服务器发送数据，关闭发送端意味着客户端不再发送更多的数据。

```go
// CloseRequest closes the send side of the stream.
func (b *BidiStreamForClient) CloseRequest() error {
	if b.err != nil {
		return b.err
	}
	return b.conn.CloseRequest()
}
```

步入 ` b.conn.CloseRequest()`

```go
func (cc *errorTranslatingClientConn) CloseRequest() error {  
    return cc.fromWire(cc.StreamingClientConn.CloseRequest())  
}
```

这个结构体的作用：

- 它是一个包装器（wrapper），用于包装 `StreamingClientConn`。

- 它的主要目的是确保从客户端返回的错误是经过编码的（coded errors），即错误信息是结构化的、可识别的，而不是原始的底层错误。

- 它通常用于协议实现中，可能是为了在协议层对错误进行统一处理。

接着步入就来到了

```go
func (cc *grpcClientConn) CloseRequest() error {  
    return cc.duplexCall.CloseWrite()  
}
```

开始观察核心代码 `duplexCall` (双工通信)
#### duplex_http_call.go

```go
package triple_protocol

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
)

// duplexHTTPCall 是一个全双工的 HTTP 调用，允许客户端和服务器之间双向通信。
// 请求体是客户端到服务器的流，响应体是服务器到客户端的流。
type duplexHTTPCall struct {
	ctx              context.Context          // 上下文，用于控制调用的生命周期
	httpClient       HTTPClient               // HTTP 客户端，用于发送请求
	streamType       StreamType               // 流类型（如单向流、双向流等）
	validateResponse func(*http.Response) *Error // 用于验证响应的函数

	// 使用 io.Pipe 作为请求体。我们将读端交给 net/http，写端用于写入数据。
	// 两端可以安全地并发使用。
	requestBodyReader *io.PipeReader // 请求体的读端
	requestBodyWriter *io.PipeWriter // 请求体的写端

	sendRequestOnce sync.Once // 确保请求只发送一次
	responseReady   chan struct{} // 用于通知响应已准备好
	request         *http.Request // HTTP 请求
	response        *http.Response // HTTP 响应

	errMu sync.Mutex // 保护 err 的互斥锁
	err   error      // 存储调用过程中发生的错误
}

// newDuplexHTTPCall 创建一个新的 duplexHTTPCall 实例。
func newDuplexHTTPCall(
	ctx context.Context,
	httpClient HTTPClient,
	url *url.URL,
	spec Spec,
	header http.Header,
) *duplexHTTPCall {
	// 复制 URL，避免外部修改影响内部逻辑
	url = cloneURL(url)
	// 创建一个 io.Pipe，用于请求体的读写
	pipeReader, pipeWriter := io.Pipe()

	// 创建一个 HTTP 请求，使用 POST 方法，并将请求体设置为 pipeReader
	request := (&http.Request{
		Method:     http.MethodPost, // 使用 POST 方法
		URL:        url,             // 请求的 URL
		Header:     header,          // 请求头
		Proto:      "HTTP/1.1",      // 协议版本
		ProtoMajor: 1,               // 主版本号
		ProtoMinor: 1,               // 次版本号
		Body:       pipeReader,      // 请求体
		Host:       url.Host,        // 请求的主机
	}).WithContext(ctx) // 将上下文绑定到请求

	// 返回一个新的 duplexHTTPCall 实例
	return &duplexHTTPCall{
		ctx:               ctx,
		httpClient:        httpClient,
		streamType:        spec.StreamType,
		requestBodyReader: pipeReader,
		requestBodyWriter: pipeWriter,
		request:           request,
		responseReady:     make(chan struct{}), // 初始化 responseReady 通道
	}
}

// Write 向请求体写入数据。如果 SetError 被调用，返回一个包装了 io.EOF 的错误。
func (d *duplexHTTPCall) Write(data []byte) (int, error) {
	// 确保请求已经发送
	d.ensureRequestMade()
	// 检查上下文是否已取消
	if err := d.ctx.Err(); err != nil {
		d.SetError(err) // 设置错误
		return 0, wrapIfContextError(err) // 返回上下文错误
	}
	// 向请求体写入数据
	bytesWritten, err := d.requestBodyWriter.Write(data)
	if err != nil && errors.Is(err, io.ErrClosedPipe) {
		// 如果管道已关闭，返回 io.EOF 而不是 io.ErrClosedPipe
		return bytesWritten, io.EOF
	}
	return bytesWritten, err
}

// CloseWrite 关闭请求体的写端。在使用 HTTP/1.x 时，调用者必须在 Read 之前调用 CloseWrite。
func (d *duplexHTTPCall) CloseWrite() error {
	// 确保请求已经发送
	d.ensureRequestMade()
	// 关闭请求体的写端
	return d.requestBodyWriter.Close()
}

// URL 返回请求的 URL。
func (d *duplexHTTPCall) URL() *url.URL {
	return d.request.URL
}

// Read 从响应体读取数据。返回第一个通过 SetError 设置的错误。
func (d *duplexHTTPCall) Read(data []byte) (int, error) {
	// 等待响应准备好
	d.BlockUntilResponseReady()
	// 检查是否有错误
	if err := d.getError(); err != nil {
		return 0, err // 返回错误
	}
	// 检查上下文是否已取消
	if err := d.ctx.Err(); err != nil {
		d.SetError(err) // 设置错误
		return 0, wrapIfContextError(err) // 返回上下文错误
	}
	if d.response == nil {
		return 0, fmt.Errorf("nil response from %v", d.request.URL) // 返回错误
	}
	// 从响应体读取数据
	n, err := d.response.Body.Read(data)
	return n, wrapIfRSTError(err) // 返回读取结果
}

// CloseRead 关闭响应体的读端。
func (d *duplexHTTPCall) CloseRead() error {
	d.BlockUntilResponseReady()
	if d.response == nil {
		return nil
	}
	// 丢弃响应体的剩余数据
	if err := discard(d.response.Body); err != nil {
		return wrapIfRSTError(err)
	}
	// 如果上下文中设置了 outgoing 数据，将 trailers 存入 incoming 上下文
	if ExtractFromOutgoingContext(d.ctx) != nil {
		newIncomingContext(d.ctx, d.ResponseTrailer())
	}
	// 关闭响应体
	return wrapIfRSTError(d.response.Body.Close())
}

// BlockUntilResponseReady 阻塞直到响应准备好。
func (d *duplexHTTPCall) BlockUntilResponseReady() {
	<-d.responseReady
}

// ensureRequestMade 确保请求已发送。
func (d *duplexHTTPCall) ensureRequestMade() {
	d.sendRequestOnce.Do(func() {
		go d.makeRequest() // 在后台发送请求
	})
}

// makeRequest 发送 HTTP 请求并处理响应。
func (d *duplexHTTPCall) makeRequest() {
	defer close(d.responseReady) // 确保 responseReady 通道被关闭

	// 发送请求并获取响应
	response, err := d.httpClient.Do(d.request)
	if err != nil {
		// 处理错误
		err = wrapIfContextError(err)
		err = wrapIfLikelyH2CNotConfiguredError(d.request, err)
		err = wrapIfLikelyWithGRPCNotUsedError(err)
		err = wrapIfRSTError(err)
		if _, ok := asError(err); !ok {
			err = NewError(CodeUnavailable, err)
		}
		d.SetError(err) // 设置错误
		return
	}
	d.response = response
	// 验证响应
	if err := d.validateResponse(response); err != nil {
		d.SetError(err)
		return
	}
	// 检查是否为双向流且 HTTP 版本低于 2
	if (d.streamType&StreamTypeBidi) == StreamTypeBidi && response.ProtoMajor < 2 {
		d.SetError(errorf(
			CodeUnimplemented,
			"response from %v is HTTP/%d.%d: bidi streams require at least HTTP/2",
			d.request.URL,
			response.ProtoMajor,
			response.ProtoMinor,
		))
	}
}

// cloneURL 复制一个 url.URL 对象。
func cloneURL(oldURL *url.URL) *url.URL {
	if oldURL == nil {
		return nil
	}
	newURL := new(url.URL)
	*newURL = *oldURL
	if oldURL.User != nil {
		newURL.User = new(url.Userinfo)
		*newURL.User = *oldURL.User
	}
	return newURL
}
```

分析方法 `Write(data []byte)` 来研究发送的实现

```go
func (d *duplexHTTPCall) Write(data []byte) (int, error) {  
    // ensure stream has been initialized  
    d.ensureRequestMade()  
    // Before we send any data, check if the context has been canceled.  
    if err := d.ctx.Err(); err != nil {  
       d.SetError(err)  
       return 0, wrapIfContextError(err)  
    }  
    // It's safe to write to this side of the pipe while net/http concurrently  
    // reads from the other side.    
    bytesWritten, err := d.requestBodyWriter.Write(data)  
    if err != nil && errors.Is(err, io.ErrClosedPipe) {  
	    return bytesWritten, io.EOF  
    }  
    return bytesWritten, err  
}
```

其中，`d.requestBodyWriter.Write(data)` 是给 `pipe` 写入数据。

而 `d.ensureRequestMade()` 是 `httpClient` 用来读数据并发送请求的，这段代码在写数据前是因为， `pipe` 是无缓冲的通道，所以在读数据时会阻塞直到写入数据。

##### 数据流动过程
###### **步骤 1：初始化**

- 创建 `duplexHTTPCall` 实例，初始化 `io.Pipe`。

- 将 `d.request.Body` 设置为 `pipeReader`。

###### **步骤 2：调用 `ensureRequestMade`**

- 在 `Write` 方法中，首先调用 `d.ensureRequestMade()`。

- `ensureRequestMade` 通过 `sync.Once` 确保 `d.httpClient.Do(d.request)` 只调用一次。

- `d.httpClient.Do(d.request)` 开始执行，并尝试从 `pipeReader` 读取数据。

###### **步骤 3：写入数据**

- 客户端调用 `Write` 方法，向 `pipeWriter` 写入数据。
    
- 写入的数据会立即被 `pipeReader` 读取，并作为请求体发送到服务器。
    
###### **步骤 4：HTTP 客户端发送请求**

- HTTP 客户端从 `pipeReader` 读取数据，并将其封装到 HTTP 请求体中。
    
- 请求被发送到服务器。
    
###### **步骤 5：服务器处理请求**

- 服务器从请求体中读取客户端发送的数据。
    
- 服务器处理数据后，通过响应体返回结果。
    
###### **步骤 6：客户端读取响应**

- 客户端通过 `Read` 方法从响应体中读取服务器返回的数据。

#### io.Pipe()

`pipeReader, pipeWriter := io.Pipe()` 是 Go 语言中用于创建一个**同步的内存管道**的代码。这个管道可以用于在两个 `goroutine` 之间传递数据，其中一个 `goroutine` 负责写入数据（通过 `pipeWriter`），另一个 goroutine 负责读取数据（通过 `pipeReader`）。它的核心特点是**阻塞式读写**，即写入和读取操作是同步的，写入时会阻塞直到数据被读取，读取时也会阻塞直到有数据可读。

##### 1. **`io.Pipe()` 的作用**

`io.Pipe()` 返回一对 `*io.PipeReader` 和 `*io.PipeWriter`，它们分别代表管道的读端和写端。这两个对象是紧密关联的：

- **`pipeWriter`**：用于向管道写入数据。
    
- **`pipeReader`**：用于从管道读取数据。
    
写入到 `pipeWriter` 的数据会立即被 `pipeReader` 读取，反之亦然。如果没有数据可读，`pipeReader` 会阻塞；如果没有空间可写，`pipeWriter` 也会阻塞。

##### 2. **`io.Pipe()` 的特点**

- **同步性**：`io.Pipe` 是同步的，写入和读取操作是阻塞的。写入操作会等待数据被读取，读取操作会等待数据被写入。
    
- **无缓冲**：`io.Pipe` 没有内部缓冲区，数据直接从写端传递到读端。
    
- **线程安全**：`io.Pipe` 是线程安全的，多个 goroutine 可以安全地并发读写。
    
- **单向流**：数据只能从 `pipeWriter` 流向 `pipeReader`，不能反向流动。
    
##### 3. **`io.Pipe()` 的典型使用场景**

`io.Pipe` 通常用于以下场景：

- **流式数据处理**：例如将一个流的数据实时传递给另一个流，而不需要中间存储。
    
- **HTTP 请求和响应**：例如在 HTTP 请求中将请求体数据流式写入，同时在另一个 goroutine 中读取响应数据。
    
- **测试和模拟**：在测试中模拟一个流式数据源或目标。

### 双向流通信的核心机制与资源管理要点解析

一、双向流通信的核心机制 在HTTP/2协议下，双向流的本质是通过`d.httpClient.Do(d.request)`建立持久化连接实现的。该接口会创建底层TCP连接，同时维护请求/响应双工通道，其中：

1. 请求端管理：

- 通过`requestBodyWriter *io.PipeWriter`进行请求体写入

- CloseRequest()方法的核心职责：

	- 关闭管道写入端：`d.requestBodyWriter.Close()`
    
    - 向服务端发送流结束信号
    
    - 触发服务端onCompleted回调（Java示例中的响应终止处理）
    
你可以在 java 的 server 端进行如下操作：

```java
@Override  
public void onCompleted() {  
      responseObserver.onCompleted();  
      System.out.println("biStream completed");  
}
```
1. 响应端管理：

- 通过`response.Body`进行响应体读取

- CloseResponse()的本质操作：`d.response.Body.Close()`

二、客户端实现的最佳实践 测试代码展示了符合生产级要求的实现模式：

```go
func TestBiDiStream2(svc greet.GreetService) error {  
    // 初始化流通道  
    stream, err := svc.GreetStream(context.Background())  
    if err != nil {  
        return err  
    }  
​  
    // 异步响应处理协程  
    waitc := make(chan struct{})  
    go func() {  
        defer close(waitc)  
        for {  
            in, err := stream.Recv()  
            if err != nil { // 捕获EOF或其他错误  
                fmt.Printf("Recv terminal: %v\n", err)  
                return  
            }  
            fmt.Printf("Response: %s\n", in.Greeting)  
        }  
    }()  
​  
    // 同步发送阶段  
    for i := 0; i < 5; i++ {  
        if err := stream.Send(&greet.GreetStreamRequest{  
            Name: "stream client!"  
        }); err != nil {  
            return err  
        }  
    }  
​  
    // 优雅关闭流程  
    stream.CloseRequest()  // 主动终止发送  
    <-waitc               // 等待响应处理完成  
    defer stream.CloseResponse() // 最终资源清理  
​  
    fmt.Println("Stream closed properly")  
    return nil  
}
```

三、资源管理的必要性

为什么需要stream.CloseResponse()，我在[相关文章](https://blog.csdn.net/cljdsc/article/details/125027270)找到了如下解释

> 为什么需要response.Body.Close()
> 
> **resp.Body.Close() 做了什么？**
> 
> 如果返回值`res`的主体未关闭，`client` 下层的 `RoundTripper` 接口（一般为 `Transport` 类型）可能无法重用 `res` 主体下层保持的 TCP 连接去执行之后的请求。所以它的作用就是用来确保body读干净，释放出该连接
> 
> **为什么这样做？**
> 
> 连接复用
> 
> **如果不这么做会发生什么？**
> 
> 第一则是：无法重新使用与服务器的持久 TCP 连接来进行后续的“保持活动”请求，在下次发起HTTP请求的时候，就会重新建立TCP连接
> 
> 第二如果不关闭当前请求，readLoop 和 writeLoop 两个 goroutine 在 写入请求并获取 response 返回后，并没有跳出 for 循环，而继续阻塞在下一次 for 循环的 select 语句里面，goroutine 一直无法被回收，cpu 和 memory 全部打满。发生goroutine内存泄漏
> 
> 第三如果请求完成后，对端关闭了连接（对端的HTTP服务器向我发送了FIN），如果这边不调用`response.Body.Close()`，那么可以看到与这个请求相关的TCP连接的状态一直处于`CLOSE_WAIT`状态，态，不会被系统回收，则文件描述符不会被释放，出现资源泄漏。

### 关于客户端管理与TCP连接复用的澄清说明

一、命名误解与技术本质

1. **客户端创建的核心逻辑** `NewGreetService` 的命名虽可能引起误解，但其技术本质是**创建客户端实例**而非直接建立TCP连接。通过源码分析可见：

```go
svc, err := greet.NewGreetService(cli)    
// 实际调用链：    
// => newClientManager(url)    
//    => 初始化 transport (http.RoundTripper) 
```    

每个客户端实例内部维护独立的**连接池（Transport）**，负责管理底层TCP连接的复用。

2. **与gRPC设计的对标性** gRPC的经典实现方式与当前方案高度一致：

```go
conn := grpc.NewClient(addr)          // 物理连接管理    
    client := pb.NewRouteGuideClient(conn) // 逻辑客户端    
    runRouteChat(client)                  // 复用连接  
```

二者的核心差异仅体现在**API抽象层级**，而非连接管理机制。

二、连接复用的实现机制

1. **Transport 的核心作用**
    
    - 作为 `http.RoundTripper` 接口实现，管理HTTP/2连接池
    
    - **自动复用空闲TCP连接**，减少三次握手开销
    
    - 通过 `MaxIdleConns` 等参数控制连接池行为
    
2. **客户端生命周期管理**

```go
// 正确用法：单例客户端复用    
    client := NewGreetService()    
    for i := 0; i < 10; i++ {    
        runBiDiStream(client) // 复用同一Transport    
    }  
```

  **关键准则**：避免重复创建客户端实例，防止产生冗余连接池。

todo：探究连接池问题