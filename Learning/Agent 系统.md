---
title: Agent 系统
date: 2026-10-12
draft: true
tags: [learning]
---

# Agent 系统

按“大类 > 细类 > 元信息”组织。元信息目前有简介和来源，以后可以加字段。

## 循环与编排

- ReAct
  - 简介：在推理、行动、观察之间循环，根据工具结果决定下一步，完成或到预算上限时停止。适合边查边调整的任务，代价是多轮调用的延迟和成本。
  - 来源：[[Agent/开发范式与框架#ReAct|开发范式与框架]]
- Plan-and-Solve
  - 简介：先拆出步骤再按计划执行，前一步的结果交给后一步。适合路径较明确的任务；计划可能漏掉条件，执行中要允许调整。
  - 来源：[[Agent/开发范式与框架#Plan-and-Solve|开发范式与框架]]
- Reflection
  - 简介：先出初稿，再评审和修订。适合代码、方案这类能迭代的任务；效果取决于反馈质量，要限制轮数。
  - 来源：[[Agent/开发范式与框架#Reflection|开发范式与框架]]
- Workflow 与 Agent
  - 简介：Workflow 由代码预先定好步骤和分支，ReAct 由模型在循环里决定下一步，两者可以组合。路径明确时，Workflow 更可控。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#Workflow、ReAct 与多 Agent|Agent 架构与工具]]
- 终止与死循环
  - 简介：反复调用同一工具、状态不更新、目标不清，都会让 Agent 打转。运行时限制总步数、时间和成本，发现没有进展就重新规划、澄清或停止。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#Planning 与死循环|Agent 架构与工具]]
- 框架选型
  - 简介：LangGraph 用节点、边和状态显式表达流程；AutoGen、AgentScope、CAMEL 侧重多角色协作。先看任务要开放协作还是要控制每个状态，再用实际任务验证。
  - 来源：[[Agent/开发范式与框架#框架提供什么|开发范式与框架]]

## 工具与 MCP

- Tool Calling
  - 简介：模型只产出工具名和参数，宿主程序校验参数和权限后执行真实代码，再把结果回传。运行时还要处理超时、错误、副作用幂等和调用预算；工具输出按外部数据对待。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#工具调用|Agent 架构与工具]]
- MCP 会话
  - 简介：Streamable HTTP 下，初始化后服务端下发 `Mcp-Session-Id`，之后的请求都带上它；服务端可以开 SSE 流持续推送消息。
  - 来源：[[Dubbo-go-Pixiu/AI 网关演进设想#Pixiu mcp-session 设计|AI 网关演进设想]]
- MCP 授权
  - 简介：Pixiu 在 MCP 授权流程中定位为资源服务器，由认证过滤器校验客户端带来的访问令牌。
  - 来源：[[Dubbo-go-Pixiu/MCP 授权设计|MCP 授权设计]]
- MCP 动态发现
  - 简介：通过统一的远程客户端监听 Nacos 上的 MCP Server 配置，转换后注册进动态工具表，配置变化时可用工具随之更新。
  - 来源：[[Dubbo-go-Pixiu/MCP 与 Nacos 集成|MCP 与 Nacos 集成]]
- MCP 网关
  - 简介：在 AI 网关基础上代理 MCP Server、把已有 API 转成 MCP Server、认证客户端、动态发现服务。工具很多时，可以先用 LLM 缩小范围再交给 Agent，省 token。
  - 来源：[[Dubbo-go-Pixiu/AI 网关演进设想#MCP 网关|AI 网关演进设想]]
- 多实例会话
  - 简介：多个网关实例共享会话时，Redis 做二级缓存集中存会话，本地内存做一级缓存加速读取，再用 Pub/Sub 通知各实例清理本地缓存，保证最终一致。
  - 来源：[[Dubbo-go-Pixiu/AI 网关演进设想#Pixiu mcp-session 设计|AI 网关演进设想]]
- Skills
  - 简介：把可复用的说明、流程、脚本和资源打包，Agent 在相关任务中按需加载。它是一种组织方式，不是新的执行主体。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#Skills|Agent 架构与工具]]

## 上下文工程

- GSSC 流程
  - 简介：把上下文构建分成收集、筛选、组织、压缩四步：先汇集候选材料，按相关性筛选，分清每段的作用，超出预算再压缩。
  - 来源：[[Agent/上下文工程#GSSC 流程|上下文工程]]
- 结构化输入
  - 简介：把任务、证据、约束分开写，信息没变，但模型更容易执行。长任务里还要区分 State（做到哪里）和 Evidence（判断依据），避免把推测当成已确认的状态。
  - 来源：[[Agent/上下文工程#为什么需要结构|上下文工程]]
- 压缩
  - 简介：先给指令、当前输入和输出留预算，再分配历史和检索结果。近期相关对话留原文，早期历史做摘要，任务目标和硬约束单独保存；不能机械地删最早的消息。
  - 来源：[[Interview/Fundamentals/Agent/上下文与记忆#上下文压缩|上下文与记忆]]
- 工具输出瘦身
  - 简介：工具返回的大 JSON 只提取必要字段放进上下文，原文留着按需读取。
  - 来源：[[Interview/Fundamentals/Agent/上下文与记忆#上下文压缩|上下文与记忆]]
- pi 的压缩方式
  - 简介：待补
  - 来源：待补

## 记忆

- 短期与长期
  - 简介：短期记忆服务当前会话，如最近消息、计划和工具结果；长期记忆跨会话保存偏好、事实和经验。
  - 来源：[[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 语义、事件、程序记忆
  - 简介：按内容分三类：语义记忆记“是什么”，如用户的稳定偏好；事件记忆记“发生过什么”；程序记忆记“怎么做”，如可复用的流程。
  - 来源：[[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 读写规则
  - 简介：关键在写入、召回、更新、删除的规则：只记值得复用的信息，保留来源，处理冲突和过期，按用户隔离。向量相似不代表事实正确。
  - 来源：[[Interview/Fundamentals/Agent/上下文与记忆#Memory|上下文与记忆]]
- 状态持久化
  - 简介：Hello-Agents 用 NoteTool 把任务状态和中间结论存到外部，每次调用前只取回相关部分，不必全部放回上下文。
  - 来源：[[Agent/上下文工程#课程中的实现组件|上下文工程]]

## RAG

- 解析与分块
  - 简介：解析时保留标题、表格、代码结构，去掉噪声；按文档边界切分，过长再递归拆。块太小丢上下文，太大混噪声；每块保留来源、章节、权限等元数据。
  - 来源：[[Interview/Fundamentals/Agent/RAG#文档解析与分块|RAG]]
- Embedding 选型
  - 简介：Embedding 把文本映射成向量，用来找语义相近的内容。选模型要用实际样本验证语言和领域效果，维度高不一定更好。
  - 来源：[[Interview/Fundamentals/Agent/RAG#Embedding 与模型选择|RAG]]
- 向量库组织
  - 简介：在 Milvus 里，结构相同的文档先放同一个 Collection，用字段过滤；要缩小范围再考虑分区或分区键；Schema 或隔离要求不同才拆 Collection。
  - 来源：[[Interview/Fundamentals/Agent/RAG#Milvus：Collection、分区与过滤|RAG]]
- 混合检索
  - 简介：关键词检索和向量检索各自召回，合并后去重、筛选，并控制进入上下文的长度。
  - 来源：[[Interview/Fundamentals/Agent/RAG#完整流程|RAG]]
- 查询重写
  - 简介：用 LLM 补全多轮对话里的指代和省略，固定模式可以用规则降成本。只在召回不足时触发，不能编造条件；可以同时检索原问题和改写后的问题。
  - 来源：[[Interview/Fundamentals/Agent/RAG#查询重写|RAG]]
- Rerank
  - 简介：召回后用更细的模型重新排序。Cross-encoder 把查询和候选一起输入，准但贵，只处理候选集。权限是硬过滤；重排补不回漏召回。
  - 来源：[[Interview/Fundamentals/Agent/RAG#Rerank|RAG]]
- GraphRAG
  - 简介：低算力的文档中心 KG-RAG 选题，有三个待验证方向：按查询做图检索、用实体邻域压缩上下文、按查询构建临时图。
  - 来源：[[Research/GraphRAG 选题草稿|GraphRAG 选题草稿]]

## 多 Agent 协作

- 要不要拆
  - 简介：子任务有独立的输入、输出和验收标准，才值得拆给多个 Agent。职责差别小或依赖强时，拆开只会增加通信、延迟和错误传播。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#多 Agent 怎么设计|Agent 架构与工具]]
- 编排结构
  - 简介：由一个编排者分发任务、子 Agent 返回结果，比较容易控制。要明确任务边界和谁能改哪部分状态，传结构化结果，不要整段转发聊天。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#多 Agent 怎么设计|Agent 架构与工具]]
- A2A 与递归控制
  - 简介：A2A 让 Agent 之间发现能力、委派任务。协议连通不代表任务会收敛，要用任务 ID、最大层数、轮数和重复委派检测，防止互相把任务抛回去。
  - 来源：[[Interview/Fundamentals/Agent/Agent 架构与工具#A2A 与递归协作|Agent 架构与工具]]
- 并发开发隔离
  - 简介：多个 Agent 同时改代码时，用 worktree 或容器隔离工作目录。冲突少用乐观并发，事后合并；冲突多考虑悲观锁，先锁文件。
  - 来源：[[GenerativeSoftwareEngineering/4 软件仓库管理：Agent 时代的版本控制|第 4 讲笔记]]

## 评测与观测

- 结果评估
  - 简介：先检查任务后的实际状态，比如文件是否改对、数据是否写入，再看工具选择、步数、成本和权限边界。有客观标准时，在隔离环境里用断言验证。
  - 来源：[[Interview/Fundamentals/Agent/评估与观测#Agent 评估|评估与观测]]
- LLM 评审
  - 简介：结果难以直接断言时，用明确的量表让模型打分，再加人工抽查。模型的评分不能自动当作事实。
  - 来源：[[Interview/Fundamentals/Agent/评估与观测#Agent 评估|评估与观测]]
- RAG 评估
  - 简介：分三层看：检索有没有召回关键材料，回答是否正确且忠于来源，系统的延迟和成本如何。测试集要覆盖多跳、时效性和知识缺失。
  - 来源：[[Interview/Fundamentals/Agent/RAG#怎么评估|RAG]]
- 幻觉
  - 简介：模型生成无依据或错误的内容，可能来自知识不足、输入歧义或检索缺失。先定位原因，再补信息、要求来源，并允许模型说不知道。
  - 来源：[[Interview/Fundamentals/Agent/评估与观测#幻觉|评估与观测]]
- 链路观测
  - 简介：用 trace 把请求、模型调用和工具执行串起来，记录 Prompt 版本、耗时、token 和错误，出了问题能从失败请求回溯到具体步骤。
  - 来源：[[Interview/Fundamentals/Agent/评估与观测#监控|评估与观测]]

## Harness 工程

- 人掌舵，Agent 执行
  - 简介：工程师的工作从写代码转向拆任务、给上下文、设计反馈回路。Agent 做不好时，先查是缺工具、缺文档还是缺规则，而不是再提示一次。
  - 来源：[[Agent/Harness Engineering 阅读思考#1. 人类从“写代码”转向“设计系统”|Harness Engineering]]
- AGENTS.md 是地图
  - 简介：超大的 AGENTS.md 会挤占上下文、让模型丢重点，也很快过期。更好的做法是写一个短入口，把知识放进结构化文档按需读取。
  - 来源：[[Agent/Harness Engineering 阅读思考#2. `AGENTS.md` 应该是地图，不该是百科全书|Harness Engineering]]
- 仓库是唯一可信记录
  - 简介：只存在于聊天记录和人脑里的决策，Agent 用不上。架构原则、设计决策、技术债状态都要写回仓库。
  - 来源：[[Agent/Harness Engineering 阅读思考#3. 代码仓库要成为唯一可信的记录系统|Harness Engineering]]
- 应用对 Agent 可读
  - 简介：给 Agent 浏览器调试、截图、日志和指标查询的能力，让它能自己复现问题、验证修复，形成闭环。
  - 来源：[[Agent/Harness Engineering 阅读思考#4. 不只是代码要可读，应用本身也要对智能体可读|Harness Engineering]]
- 机械约束
  - 简介：分层架构、依赖方向、命名和文件大小等规则写进 lint 和结构测试，靠工具强制，不靠自觉。
  - 来源：[[Agent/Harness Engineering 阅读思考#5. 架构约束要靠机械规则强制执行|Harness Engineering]]
- 高吞吐下的合并策略
  - 简介：Agent 的产能远超人的注意力时，等待比修错更贵，所以 PR 保持短小，偶发的测试失败用重跑或补丁修正。
  - 来源：[[Agent/Harness Engineering 阅读思考#6. 高吞吐量下，合并策略会变化|Harness Engineering]]
- 熵与垃圾回收
  - 简介：Agent 生成的代码库也会漂移。把原则写成可执行规则，定期跑后台任务扫描偏差，自动发起清理 PR。
  - 来源：[[Agent/Harness Engineering 阅读思考#7. 熵会积累，所以要有“垃圾回收”机制|Harness Engineering]]

## 模型与 Prompt

- 生成原理
  - 简介：输入先分成 token，Transformer 算出下一个 token 的概率分布，再用贪心或采样选出，逐个生成。概率高不等于事实正确。
  - 来源：[[Interview/Fundamentals/Agent/LLM 与 Prompt#如何生成下一个 token|LLM 与 Prompt]]
- 成本与延迟
  - 简介：长输入增加 prefill 的计算，长输出增加串行 decode 的步数。先分开测首 token 延迟和后续间隔，再决定是减上下文、换模型还是改调度。
  - 来源：[[Interview/Fundamentals/Agent/LLM 与 Prompt#成本与延迟|LLM 与 Prompt]]
- 限流
  - 简介：QPM 限请求数，TPM 限 token 量，两个都要检查。配额不足时进有界队列或直接拒绝；重试要有限退避，避免放大流量。
  - 来源：[[Interview/Fundamentals/Agent/LLM 与 Prompt#TPM、QPM 限流|LLM 与 Prompt]]
- Prompt 管理
  - 简介：记录模板版本、适用模型和输入变量，用固定样本比较成功率和成本，效果变差能回退。没有评测数据，就判断不了一次改写是否有效。
  - 来源：[[Interview/Fundamentals/Agent/LLM 与 Prompt#提示词设计与管理|LLM 与 Prompt]]
- 结构化输出
  - 简介：合法 JSON、符合 schema、业务内容正确是三层不同的要求。格式对了，仍要校验字段含义和权限。
  - 来源：[[Interview/Fundamentals/Agent/LLM 与 Prompt#JSON 输出|LLM 与 Prompt]]
