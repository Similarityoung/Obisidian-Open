---
title: 4 软件仓库管理：Agent 时代的版本控制
type: notes
slug: generative-software-engineering-version-control
summary: Git 的协作方式建立在人类的节奏上，Agent 并发开发后，难点从工具转到任务分解。
date: 2026-10-12T16:52:00+08:00
draft: true
categories:
  - Engineering
---

# 4 软件仓库管理：Agent 时代的版本控制

## 我的理解

- 版本管理做三件事：记住现在、记住历史、记住教训。这在 Agent 时代和古法编程时代都成立。
- Git 的协作方式跟不上 Agent 并发开发的速度，需要新的协作方式，比如用锁控制并发。
- 更难的是团队管理：任务拆分和明确需求。我想成为能把任务分解清楚的 team leader。

## 核心观点

### 文档、代码、测试会脱节

文档写的是 linked list，代码后来改成了 tree，文档没人改。文件系统只是一棵目录树，表达不了三者的对应关系。讲师设想用 repo.db 记录这些关系，让 AI 维护一致性。

### Git 的隐藏假设被 Agent 打破

Git 默认人是单线程的，十分钟左右提交一次，每次提交有明确作者。Agent 秒级提交、可以同时开多个，还是同一个模型的克隆体，blame 追责也失去了意义。jj（Jujutsu）把 change 当一等公民，去掉暂存区，是重新设计的一个样本。

### 并发：先隔离，再选锁

- 隔离：一个 Agent 一个容器，或用 git worktree 给每个 Agent 独立工作目录。
- 乐观并发：各写各的，冲突了再 merge，适合人类节奏。
- 悲观并发：动手前先锁文件，适合冲突频繁的 Agent，代价是并行度下降。

锁只能让冲突排队，好的任务分解才能让冲突不发生。讲师的说法是：版本控制是工具，团队管理才是困难。

### 早期的 prompt 决定项目走向

讲师把 Lab 1 需求直接丢给 Agent，得到一整套教务系统，而他只想要一个学习助手。Agent 过度遵循字面要求，没理解真实意图。解法是 MVP：先只做绝对要的功能，第一版不用数据库，用文件系统，等文件多了再让 Agent 提炼。

来源：[生成式软件工程（NJU）第 4 讲](https://linbol.top/videobook/%E8%BD%AF%E4%BB%B6%E4%BB%93%E5%BA%93%E7%AE%A1%E7%90%86%20%282%29%20%5B04-Raw%EF%BC%8F26%E7%94%9F%E6%88%90%E5%BC%8F%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B%EF%BC%8FNJU%5D/book.html)
