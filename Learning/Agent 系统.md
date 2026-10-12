---
title: Agent 系统
date: 2026-10-12
draft: true
tags: [learning]
---

# Agent 系统

按大类 > 细类组织，细类后跟元信息。元信息结构待定，目前只记来源。新方法出现时加一个细类。

## 循环与编排

- ReAct：推理、行动、观察循环 · [[Agent/开发范式与框架#ReAct|范式]]
- Plan-and-Solve：先拆步骤再执行，允许调整计划 · [[Agent/开发范式与框架#Plan-and-Solve|范式]]
- Reflection：执行、评审、修订，限制轮数 · [[Agent/开发范式与框架#Reflection|范式]]
- Workflow 与 Agent 的选择：路径明确用代码定步骤 · [[Interview/Fundamentals/Agent/Agent 架构与工具#Workflow、ReAct 与多 Agent|架构与工具]]
- 终止与死循环：步数、时间、成本上限，检测无进展 · [[Interview/Fundamentals/Agent/Agent 架构与工具#Planning 与死循环|架构与工具]]
- 框架选型：LangGraph、AutoGen、AgentScope、CAMEL 等 · [[Agent/开发范式与框架#框架提供什么|范式]]

## 工具与 MCP

- Tool Calling 流程：宿主校验参数和权限，处理超时与幂等 · [[Interview/Fundamentals/Agent/Agent 架构与工具#工具调用|架构与工具]]
- MCP 会话：Streamable HTTP、Mcp-Session-Id、SSE · [[Dubbo-go-Pixiu/AI 网关演进设想#Pixiu mcp-session 设计|AI 网关]]
- MCP 授权：网关作资源服务器验证 token · [[Dubbo-go-Pixiu/MCP 授权设计|MCP 授权]]
- MCP 动态发现：Nacos 下发配置，动态注册工具 · [[Dubbo-go-Pixiu/MCP 与 Nacos 集成|MCP 与 Nacos]]
- MCP 网关：代理、转换、用 LLM 缩小工具范围 · [[Dubbo-go-Pixiu/AI 网关演进设想#MCP 网关|AI 网关]]
- 多实例会话：本地缓存 + Redis + Pub/Sub 失效 · [[Dubbo-go-Pixiu/AI 网关演进设想#Pixiu mcp-session 设计|AI 网关]]
- Skills：打包说明、流程、脚本，按需加载 · [[Interview/Fundamentals/Agent/Agent 架构与工具#Skills|架构与工具]]

## 上下文工程

- GSSC 流程：收集、筛选、组织、压缩 · [[Agent/上下文工程#GSSC 流程|上下文工程]]
- 结构化输入：分开任务、证据、约束，区分 State 与 Evidence · [[Agent/上下文工程#为什么需要结构|上下文工程]]
- 压缩：先留预算，近期原文、早期摘要，关键约束单独保存 · [[Interview/Fundamentals/Agent/上下文与记忆#上下文压缩|上下文与记忆]]
- 工具输出瘦身：大 JSON 只取必要字段，原文按需读 · [[Interview/Fundamentals/Agent/上下文与记忆#上下文压缩|上下文与记忆]]
- pi 的压缩方式：自述学过 · 来源待补

## 记忆

- 短期与长期：会话内状态和跨会话的偏好、经验 · [[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 按内容分类：语义、事件、程序记忆 · [[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 读写规则：写入、召回、更新、删除，处理冲突和过期 · [[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 状态持久化：NoteTool 记任务状态，按需取回 · [[Agent/上下文工程#课程中的实现组件|上下文工程]]

## RAG

- 解析与分块：按文档边界切，overlap 取舍，保留元数据 · [[Interview/Fundamentals/Agent/RAG#文档解析与分块|RAG]]
- Embedding 选型：用实际样本验证，维度不是越高越好 · [[Interview/Fundamentals/Agent/RAG#Embedding 与模型选择|RAG]]
- 向量库组织：Milvus 的 Collection、分区与过滤 · [[Interview/Fundamentals/Agent/RAG#Milvus：Collection、分区与过滤|RAG]]
- 混合检索：关键词与向量合并召回 · [[Interview/Fundamentals/Agent/RAG#完整流程|RAG]]
- 查询重写：补全指代，按需触发，不编造条件 · [[Interview/Fundamentals/Agent/RAG#查询重写|RAG]]
- Rerank：Cross-encoder 精排，权限是硬过滤 · [[Interview/Fundamentals/Agent/RAG#Rerank|RAG]]
- GraphRAG：查询相关图检索、实体邻域压缩、临时图 · [[Research/GraphRAG 选题草稿|GraphRAG 选题]]

## 多 Agent 协作

- 要不要拆：子任务有独立输入、输出和验收标准才拆 · [[Interview/Fundamentals/Agent/Agent 架构与工具#多 Agent 怎么设计|架构与工具]]
- 编排结构：编排者分发、子 Agent 返回，明确状态归属 · [[Interview/Fundamentals/Agent/Agent 架构与工具#多 Agent 怎么设计|架构与工具]]
- A2A 与递归控制：任务 ID、最大层数、重复委派检测 · [[Interview/Fundamentals/Agent/Agent 架构与工具#A2A 与递归协作|架构与工具]]
- 并发开发隔离：worktree、一个 Agent 一个容器、乐观与悲观并发 · [[GenerativeSoftwareEngineering/4 软件仓库管理：Agent 时代的版本控制|第 4 讲]]

## 评测与观测

- 结果评估：先查任务后的实际状态，再看过程 · [[Interview/Fundamentals/Agent/评估与观测#Agent 评估|评估与观测]]
- LLM 评审：明确量表加人工抽查，评分不当事实 · [[Interview/Fundamentals/Agent/评估与观测#Agent 评估|评估与观测]]
- RAG 评估：分检索、回答、系统三层定位问题 · [[Interview/Fundamentals/Agent/RAG#怎么评估|RAG]]
- 幻觉：先定位原因，再补信息、要求来源 · [[Interview/Fundamentals/Agent/评估与观测#幻觉|评估与观测]]
- 链路观测：trace 串起模型和工具调用，记录版本与 token · [[Interview/Fundamentals/Agent/评估与观测#监控|评估与观测]]

## Harness 工程

- AGENTS.md 是地图：简短入口，细节放局部文档 · [[Agent/Harness Engineering 阅读思考|Harness 阅读]]
- 仓库是唯一可信记录：知识要进仓库，Agent 才看得到 · [[Agent/Harness Engineering 阅读思考|Harness 阅读]]
- 机械约束：用测试、lint、CI 强制架构规则 · [[Agent/Harness Engineering 阅读思考|Harness 阅读]]
- 熵与垃圾回收：定期清理 Agent 产生的冗余 · [[Agent/Harness Engineering 阅读思考|Harness 阅读]]

## 模型与 Prompt

- 生成原理：token、Transformer、采样 · [[Interview/Fundamentals/Agent/LLM 与 Prompt#如何生成下一个 token|LLM 与 Prompt]]
- 成本与延迟：TTFT、prefill 与 decode 的优化点 · [[Interview/Fundamentals/Agent/LLM 与 Prompt#成本与延迟|LLM 与 Prompt]]
- 限流：TPM、QPM，有界队列与退避 · [[Interview/Fundamentals/Agent/LLM 与 Prompt#TPM、QPM 限流|LLM 与 Prompt]]
- Prompt 管理：模板版本、固定样本评测、回退 · [[Interview/Fundamentals/Agent/LLM 与 Prompt#提示词设计与管理|LLM 与 Prompt]]
- 结构化输出：合法 JSON、符合 schema、业务正确是三回事 · [[Interview/Fundamentals/Agent/LLM 与 Prompt#JSON 输出|LLM 与 Prompt]]
