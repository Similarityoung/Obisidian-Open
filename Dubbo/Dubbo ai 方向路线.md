---
title: Dubbo ai 方向路线
tags: [ Dubbo]
categories: [Dubbo]
date: 2025-04-04T19:39:21+08:00
draft: true
---
todo： 给 dubbo-go-pixiu 添加 streamable http 的适配

## AI 应用架构新范式

### AI 应用架构图

![image.png](https://img.simi.host/20250422133722.png)

#### 调用链路说明

1. 用户向AI应用发起请求，请求流量进入流量网关（云原生API网关）。
2. 云原生API网关侧维护管理了不同类型的AI Agent的API或路由规则，将用户请求转发至对应的AI Agent。（可以考虑接入 A2A 协议）
3. AI Agent无论以哪种方式实现，只要其中的节点需要获取数据，便向MCP网关（云原生API网关）请求获取可用的MCP Server及MCP Tool的信息。
4. 因为MCP网关处可能维护了很多MCP信息，可以借助LLM缩小MCP范围，减少Token消耗，所以向AI网关（云原生API网关）发请求和LLM交互。（这一步可选）
5. MCP网关将确定好范围的MCPServer及MCP Tool的信息List返回给AIAgent。
6. AI Agent将用户的请求信息及从MCP网关拿到的所有MCP信息通过AI网关发送给LLM。
7. 经过LLM推理后，返回解决问题的唯一MCP Server和MCP Tool信息。
8. AI Agent拿到确定的MCP Server和MCP Tool信息后通过MCP网关对该MCP Tool做请求。

实际生产中 ③-⑧ 步会多次循环交互

### 云原生 API 网关

注：

> 南北走向流量为 client-server 的流量
> 东西走向流量为 server-sever 流量

