---
title: Dubbo-go-Pixiu 开源之夏开发规划
tags: []
categories: []
date: 2025-07-19T18:58:03+08:00
draft: true
---
### TODO：
2. 添加 nacos 支持动态更新功能（优先）
3. 添加 mcp session 进行多集群模式(未来)
4. 添加 mcp auth 权限认证 (https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)（优先）
5. 语音，图像的 mcp 兼容（未来）
6. mcp server 的后端不止可以是 openapi，还可以是 grpc，dubbo
7. 支持 resource 和 prompt
8. 对齐 mcp 协议的新特性（logging，completion，pagination)[](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities)
9. 可观测性（未来）

### 测试：

采用 inspector 进行测试（https://modelcontextprotocol.io/docs/tools/inspector#inspector）