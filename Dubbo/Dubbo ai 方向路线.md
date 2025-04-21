---
title: Dubbo ai 方向路线
tags: [ Dubbo]
categories: [Dubbo]
date: 2025-04-04T19:39:21+08:00
draft: true
---
todo： 给 dubbo-go-pixiu 添加 streamable http 的适配



项目名称： 基于 Dubbo-go-Pixiu 集成 MCP(Model Context Protocol) 与 A2A(Announcing the Agent2Agent Protocol) 

项目描述：

随着人工智能技术的飞速发展，越来越多的应用开始集成大型语言模型（LLM）等 AI 服务。传统的 API 网关主要面向微服务（如 HTTP/Dubbo/gRPC）设计，难以满足 AI 服务特有的需求，例如对流式协议（SSE/WebSocket）的深度支持、基于 Token 的流量管理、AI 特有的可观测性指标以及与 AI 控制平面的集成。
本项目旨在增强 Apache Dubbo-go-Pixiu 网关的能力，使其成为一个功能强大的 AI 网关。项目将基于 Dubbo-go-Pixiu 现有的框架，完成以下关键改进：

AI 协议与流式支持增强： 扩展网关对 OpenAI 兼容协议的完整支持，特别是对 SSE (Server-Sent Events) 和 HTTP/2 分块传输等流式接口的处理能力，以及多模态数据（如 Base64 编码图像、音频等）的初步解析能力。

AI 相关的服务治理： 实现基于 Token 的精流量控制、Token 用量统计与计费、以及可能的治理策略（如模型回退策略）。

AI 可观测性： 集成和扩展可观测性指标，不仅包含传统的网络和性能指标，更要捕获 AI 服务特有的指标，如 Token 处理速度、Token 消耗总量。
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