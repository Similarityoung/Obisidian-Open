---
title: 4 软件仓库管理：Agent 时代的版本控制
type: notes
slug: generative-software-engineering-version-control
summary: Git 的协作方式建立在人类的节奏上，Agent 并发开发后，难点从工具转到任务分解。
date: 2026-10-12T16:52:00+08:00
draft: false
categories:
  - Engineering
---

# 4 软件仓库管理：Agent 时代的版本控制

## 我的理解

- 版本管理做三件事：记住现在、记住历史、记住教训。这在 Agent 时代和古法编程时代都成立。
- Git 的协作方式跟不上 Agent 并发开发的速度，需要新的协作方式，比如用锁控制并发。
- 更难的是团队管理：把需求讲清楚，把大任务拆成能独立推进的小块。团队里最稀缺的，往往是能做好这件事的人。

## 核心观点

### 版本管理的三件事

三件事没变，但在 AI 时代各有新的含义。

- **记住现在**：Agent 看不到聊天记录和人脑里的东西，仓库里有的才算存在。所以仓库要成为唯一可信的记录，需求、设计和约定都要写进去。
- **记住历史**：Agent 试错很便宜，走错了就回到某个提交，从另一条路重来。小步提交就是留存档点，方便回退。
- **记住教训**：Git 只记录改了什么，不记录为什么这条路走不通。Agent 没有跨会话的记忆，每次都从零开始，所以教训要写进文件，比如提交信息里写清原因，`AGENTS.md` 里写下规则。前两件工具能自动做到，这一件要靠人主动记。

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

## 拆解案例

大型开源项目怎么把成百上千人拆成能独立推进的小团队。三者的共同点是：按代码边界分块，每块有明确负责人，跨块的事走固定流程。

### Linux 内核：子系统与维护者层级

- 切块：按子系统划分，如网络、内存管理、各类架构支持。`MAINTAINERS` 文件写明每块代码归谁管。
- 协调：维护者各管一棵代码树，下级维护者的补丁逐级汇入上级，最后由 Linus 拉取合并。这是一条信任链，每一级只审查下一级。
- 节奏：每 2～3 个月发布一版。开头约两周是合并窗口，之后只接受修复。linux-next 每天合并各子系统的树，提前暴露冲突。

### Chromium：OWNERS 文件

- 切块：按目录划分。每个目录的 `OWNERS` 文件列出有权批准修改的人，子目录默认继承上级。
- 协调：一次改动涉及几个目录，就要拿到每个目录 owner 的批准。`set noparent` 可以切断继承，`per-file` 可以给特定文件单独指定 owner。
- 特点：权限和代码结构绑在一起，由代码评审工具强制执行，不靠口头约定。

### Kubernetes：SIG 分工

- 切块：按功能领域成立 SIG（Special Interest Group），如网络、存储、节点。每个 SIG 有章程，写明范围、职责和决策方式；SIG 下的子项目由 OWNERS 负责。
- 协调：跨多个 SIG 的短期议题成立工作组；较大的改动写 KEP（增强提案），在 SIG 之间达成一致后再做。
- 特点：SIG 的会议、讨论和设计都公开，方便别的 SIG 了解它在做什么，减少你不知道我在做什么带来的冲突。

来源：[生成式软件工程（NJU）第 4 讲](https://linbol.top/videobook/%E8%BD%AF%E4%BB%B6%E4%BB%93%E5%BA%93%E7%AE%A1%E7%90%86%20%282%29%20%5B04-Raw%EF%BC%8F26%E7%94%9F%E6%88%90%E5%BC%8F%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B%EF%BC%8FNJU%5D/book.html)；[Linux 内核开发流程](https://www.kernel.org/doc/html/latest/process/2.Process.html)；[Chromium Code Reviews](https://chromium.googlesource.com/chromium/src/+/main/docs/code_reviews.md)；[Kubernetes 治理](https://github.com/kubernetes/community/blob/master/governance.md)
