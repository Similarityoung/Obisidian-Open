---
title: Dubbo ai 方向路线
tags: [ Dubbo]
categories: [Dubbo]
date: 2025-04-04T19:39:21+08:00
draft: true
---
todo： 给 dubbo-go-pixiu 添加 streamable http 的适配



项目名称： 基于 Dubbo-go-Pixiu 构建 MCP/A2A 协议的 AI 网关及混合治理能力集成

项目描述：

随着 AI 技术的快速发展，以及 Agent 技术的兴起，应用间的互联互通需求日益增长。传统的 API 网关在面对新型协议（如 MCP、A2A）和复杂的应用场景时，在协议兼容性、安全认证、动态能力协商和混合治理等方面存在不足。尤其是在 AI Agent 场景下，不同 Agent 采用不同通信协议，需要网关具备灵活的协议适配和转换能力。

本项目旨在基于 Apache Dubbo-go-Pixiu 现有框架，构建一个支持 MCP/A2A 协议的 AI 网关，增强其在 Agent 互联互通和混合治理方面的能力，使其成为一个面向未来的、灵活可扩展的协议网关。

多协议支持：在现有 HTTP/SSE 基础上，集成 MCP (JSON-RPC) 和 A2A 协议，实现对多种通信协议的统一支持。

统一安全模型：构建基于 OAuth 2.1 和 API Key 的统一认证授权体系，覆盖 HTTP/SSE, MCP 和 A2A 协议，提供一致的安全策略管理。

动态能力协商：实现基于 MCP 协议的能力协商机制，支持在请求转发过程中，根据客户端和服务端的能力动态调整处理策略，提升系统的灵活性和兼容性。

混合治理：将现有的 AI 治理能力（如 Token 限流）扩展到 MCP 和 A2A 协议的上下文中，实现对不同协议的统一治理。

目前，Dubbo-go-Pixiu 已有初步的 AI 协议（HTTP/SSE）支持和 Token 计算的基础工作。本项目将在此基础上，进一步完善这些核心能力，实现一个面向未来、支持混合治理的 AI 网关。

项目难度： 进阶/Advanced

技术领域： Gateway, AI, Cloud Native, Microservices

编程语言： Go

项目产出要求：

在 Apache Dubbo-go-Pixiu 中实现对 OpenAI 兼容协议（/v1/chat/completions 等）的完整支持，包括 SSE/HTTP/2 的流式数据处理。
实现可用的基于 Token 的动态限流过滤器。
实现 Token 用量统计功能，并集成到 Prometheus 指标中（例如 ai_tokens_processed_total）。
实现可用的模型回退策略。
为新增功能编写相应的单元测试、集成测试和文档。

项目技术要求：

熟练掌握 Go 语言编程。
深入理解 HTTP/1.1, HTTP/2, SSE 等网络协议原理，了解流式数据处理。
了解 API 网关或代理的基本工作原理。
具有良好的代码风格和文档撰写能力。

项目成果仓库：

https://github.com/apache/dubbo-go-pixiu
https://github.com/apache/dubbo-go-pixiu-samples

预估工时：300 小时
支持架构：不限