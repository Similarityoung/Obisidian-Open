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

