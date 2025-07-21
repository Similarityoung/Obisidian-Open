---
title: Dubbo-go-Pixiu 开源之夏开发规划
tags: []
categories: []
date: 2025-07-19T18:58:03+08:00
draft: true
---
### MCP OverPixiu Milestones

#### Step 1: 基础能力建设

1. **MCP 基础协议支持**：支持 MCP (Model Context Protocol) 的核心功能，为上层应用提供统一的模型上下文交互能力。
    
2. **动态配置更新**：集成 Nacos，实现配置的动态更新，提高系统的灵活性和可维护性。
    
3. **权限认证**：增加 MCP [Auth 权限认证机制](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)，保障模型的安全访问和合规使用。
    
4. **核心对象支持**：完整支持 MCP 中的 `resource` 和 `prompt` 对象。

#### Step 2: 兼容与扩展

1. **多后端支持**：扩展 MCP Server 的后端能力，除了 OpenAPI，还将支持 gRPC 和 Dubbo，提供更广泛的后端服务接入能力。
    
2. **多集群模式**：引入 MCP Session，支持多集群模式，提升系统的可伸缩性和容灾能力。
    

#### Step 3: 完善与增强

1. **多模态数据兼容**：探索在 MCP 体系下对语音、图像等多模态数据的兼容方案。
    
2. **协议新特性对齐**：对齐 MCP 协议的[最新特性](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities)，包括日志（logging）、自动完成（completion）和分页（pagination）。
    
3. **可观测性**：构建完善的可观测性体系，方便对系统进行监控和问题排查。

### 测试

- **测试工具**：采用官方推荐的 [`inspector` 工具](https://modelcontextprotocol.io/docs/tools/inspector#inspector)进行全面的协议兼容性和功能测试。