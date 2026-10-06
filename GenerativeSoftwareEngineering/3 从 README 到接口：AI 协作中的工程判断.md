---
title: 3 从 README 到接口：AI 协作中的工程判断
type: notes
slug: generative-software-engineering
summary: "模型能力越强，工程师的品味越重要。通过阅读成熟项目、比较设计决策，积累对架构、README 和接口的判断。"
date: 2026-10-05T13:06:22+08:00
draft: true
categories:
  - Engineering
---

# 3 从 README 到接口：AI 协作中的工程判断

## 模型越强，工程师的品味越重要

随着模型能力的提升，工程师的品味会越来越重要。AI 可以快速写出代码，工程师则需要判断采用什么方案、怎样组织模块、接口应该暴露什么。这些选择决定了软件最终的质量。

我理解的工程品味，是对这些选择的判断力：看到一个设计，能理解它为什么这样做；面对自己的问题，也能做出合适的取舍。模型越能实现我们的想法，我们对这些想法的判断就越重要。

## 从成熟项目中积累经验

提升品味，我觉得一个很直接的办法是读成熟项目。尤其是那些在 AI 编程普及之前就长期维护的 GitHub 仓库，可以看它的架构、模块划分，也可以从 README 入手，学习作者怎样组织和介绍一个项目。

### 从 curl 的 README 看内容取舍

讲师提到，README 可以尽量简洁：介绍用途，写一点简单用法，有必要时加截图，再留一个详细文档的入口。我认同这种安排，读者能理解项目、开始使用，就已经很好了。

[curl 的 README](https://github.com/curl/curl/blob/master/README.md) 就很短。开头说明它通过 URL 与服务器传输数据，并列出支持的协议；使用、安装和 libcurl 的资料，都有各自的文档入口。

curl 的功能很多，README 仍然能保持简洁。我想从中学习的是内容的取舍：哪些信息值得放在最前面，哪些可以交给详细文档。以后写自己的 README，也可以先考虑读者需要知道什么。

### 先想自己会怎么做，再看成熟项目怎么做

阅读项目时，我想多做一步：遇到一个设计决策，先想如果是自己，会怎样处理，再去看项目的实际做法。这也是我对课程中 Virtual Implementation 的理解。

例如，写 README 时，我会保留哪些内容？划分模块时，我会把哪些职责放在一起？带着自己的方案去对照，差异才更容易引起注意，也更容易追问它背后的理由。

比较时，还需要理解项目面对的需求和约束。逐渐积累这些具体决策的经验，遇到相似问题时，才更有依据判断怎样做合适。

## 接口设计仍然需要经验

最近发布 1.0 的 pi，可以作为继续观察接口的例子。它的 [edit 工具](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/edit.ts)在成功执行后，通过 `content` 给模型简短的结果说明，通过 `details` 提供差异等数据供日志和界面使用。[结果渲染](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/renderers/edit.ts)也有单独的实现。

这让我注意到，同一个操作的结果可以面向不同的使用者组织。但我现在对怎样设计一个好接口，还没有足够清楚的判断。哪些信息应该暴露，哪些细节应该留在内部，怎样划分职责才方便后续使用和修改，这些都需要更多经验。

看懂 pi 的这段实现之后，我仍然需要比较其他项目怎样处理类似问题，也需要在自己的项目里尝试。只有见过不同设计，并经历过使用和修改，才更容易理解一个接口的取舍。

这也是我想继续学习成熟项目的原因：积累能支撑判断的经验，才能更好地选择 AI 给出的方案。

## 附录：一个 Git 彩蛋

在 PR 的描述中写上：

```text
fixed #3
```

当 PR 合并到默认分支，且仓库启用了自动关闭关联 issue 的设置时，GitHub 会自动关闭该仓库的 issue #3。具体规则见 [GitHub 官方说明](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)和[自动关闭设置](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-auto-closing-issues)。
