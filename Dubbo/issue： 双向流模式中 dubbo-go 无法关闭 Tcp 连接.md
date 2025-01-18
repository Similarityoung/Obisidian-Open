---
title: issue： 双向流模式中 dubbo-go 无法关闭 Tcp 连接
tags: [ issue]
categories: [Dubbo]
date: 2025-01-17T17:10:25+08:00
draft: true
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

```java
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

```java
if err := stream.CloseRequest(); err != nil {  
       return err  
    }  
    if err := stream.CloseResponse(); err != nil {  
       return err  
    } 
```

1. 客户端调用 `CloseRequest()` 关闭请求部分，表示不再发送更多的请求。
    
2. 客户端调用 `CloseResponse()` 关闭响应部分，表示不再接收更多的响应。

下面从closeRequest( )开始进行源码分析

### closeRequest( )

 `CloseRequest` 方法的作用：**关闭流的发送端**。在双向流通信中，流的发送端用于客户端向服务器发送数据，关闭发送端意味着客户端不再发送更多的数据。

```java
// CloseRequest closes the send side of the stream.
func (b *BidiStreamForClient) CloseRequest() error {
	if b.err != nil {
		return b.err
	}
	return b.conn.CloseRequest()
}
```

步入 ` b.conn.CloseRequest()`

```java
func (cc *errorTranslatingClientConn) CloseRequest() error {  
    return cc.fromWire(cc.StreamingClientConn.CloseRequest())  
}
```

