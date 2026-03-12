---
title: Agent 开发
date: 2026-03-05
tags:
  - agent
  - react
  - plan-and-solve
  - reflection
  - framework
  - autogen
  - agentscope
  - camel
  - langgraph
aliases:
  - 智能体三大经典范式速记
  - 框架开发实践四框架速记
---

# Agent 开发

> [!summary]
> 本文把“智能体经典范式（怎么思考与执行）”和“框架开发实践（怎么工程化落地）”合并为一份速记。

## 第一部分：三大经典范式

下面按《第四章 智能体经典范式构建》里提到的三种智能体模式做一个抓重点总结：ReAct、Plan-and-Solve、Reflection。 ([GitHub][1])

### 1) ReAct（Reasoning and Acting）

核心思想：把 Thought、Action、Observation 放进同一闭环，边推理边行动，利用外部反馈持续修正。 ([GitHub][2])

典型流程：

- Thought：分析现状、决定下一步
- Action：调用工具或输出最终答案
- Observation：读取工具结果并更新上下文
- 循环直到完成或达到步数上限

优势：

- 可解释性强
- 动态纠错快
- 特别适合工具驱动任务（搜索/计算/API）

局限：

- 依赖模型格式遵循与推理稳定性
- 多轮调用带来时延与成本
- 提示词和解析链条较脆弱

### 2) Plan-and-Solve

核心思想：先规划（Plan）再执行（Solve），通过“先出蓝图”提升执行稳定性。 ([GitHub][1])

典型流程：

1. Planning：分解任务并输出步骤计划
2. Solving：按计划逐步执行，前一步结果作为后续上下文

优势：

- 结构清晰、目标一致性高
- 适合路径确定、内部推理密集任务

局限：

- 计划偏静态，执行中遇到新情况需要额外动态重规划机制

### 3) Reflection

核心思想：执行后反思、反思后修订，通过迭代提升质量与可靠性。 ([GitHub][1])

典型流程：

1. Execution：先生成初稿
2. Reflection：从评审视角给结构化反馈
3. Refinement：基于初稿与反馈生成改进版
4. 多轮迭代直到收敛或到上限

优势：

- 显著提升代码/方案类输出的可用性与正确性

关键配套：

- 需要记忆/轨迹存储，保留每轮执行与反馈支撑持续优化

### 三者怎么选

- ReAct：信息不全且要边探索边调用工具
- Plan-and-Solve：路径较确定且要稳定多步执行
- Reflection：质量优先且接受更高迭代成本

## 第二部分：四大框架实践

### 1. 为什么从手写走向框架

- 复用与效率：封装通用循环，减少重复造轮子
- 解耦与扩展：模型/工具/记忆分层，替换更容易
- 状态管理：支持长时运行与多轮状态追踪
- 可观测调试：回调与钩子提升排障效率

### 2. 四个代表框架抓重点

#### 2.1 AutoGen（对话协作优先）

- 核心理念：多智能体协作抽象为自动群聊
- 关键机制：`autogen-core` + `autogen-agentchat`、异步优先、角色分工（`AssistantAgent` / `UserProxyAgent`）
- 案例：软件团队协作做实时比特币价格 Web 应用

#### 2.2 AgentScope（工程化优先）

- 核心理念：面向企业级生产，强调分布式、容错、可观测
- 关键机制：消息驱动 + 组合式架构，并发执行、状态管理、工具并行
- 案例：三国狼人杀，突出结构化约束、并发投票、异常兜底

#### 2.3 CAMEL（轻量角色扮演）

- 核心理念：用最少人工编排驱动角色协作
- 关键机制：Role-Playing + Inception Prompting
- 案例：AI 心理学家 + AI 作家协作写拖延症科普电子书

#### 2.4 LangGraph（图状态机工作流）

- 核心理念：把流程建模为状态机有向图
- 关键机制：Nodes + Edges + 全局 State
- 案例：三步问答助手、条件路由循环（`add_conditional_edges`）
- 权衡：流程可控性强，但设计与调试复杂度更高

### 3. 一页选型速查

| 框架 | 最适合场景 | 主要优势 | 主要代价 |
| --- | --- | --- | --- |
| AutoGen | 多角色对话协作 | 协作自然、上手快 | 成本与流程稳态约束压力 |
| AgentScope | 企业级并发与分布式 | 工程化能力强 | 接入与学习成本更高 |
| CAMEL | 轻量实验与创作协作 | 机制简洁、验证快 | 对提示依赖高 |
| LangGraph | 强流程控制与循环任务 | 状态显式、可控性强 | 样板与调试复杂度高 |

## 总结

- 范式决定“思考与行动方式”。
- 框架决定“工程落地能力”。
- 实战里通常是组合使用：先选范式，再用合适框架把范式稳定实现。

## 参考

- [1] [hello-agents/docs/chapter4/第四章 智能体经典范式构建.md](https://github.com/datawhalechina/hello-agents/blob/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)
- [2] [chapter4 原始 markdown](https://raw.githubusercontent.com/datawhalechina/hello-agents/main/docs/chapter4/%E7%AC%AC%E5%9B%9B%E7%AB%A0%20%E6%99%BA%E8%83%BD%E4%BD%93%E7%BB%8F%E5%85%B8%E8%8C%83%E5%BC%8F%E6%9E%84%E5%BB%BA.md)
- [3] [第六章 框架开发实践 | Hello-Agents](https://book.heterocat.com.cn/chapter6/%E7%AC%AC%E5%85%AD%E7%AB%A0-%E6%A1%86%E6%9E%B6%E5%BC%80%E5%8F%91%E5%AE%9E%E8%B7%B5)
