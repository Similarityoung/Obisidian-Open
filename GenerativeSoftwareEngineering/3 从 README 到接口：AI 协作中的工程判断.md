---
title: 3 从 README 到接口：AI 协作中的工程判断
type: notes
slug: generative-software-engineering
summary: 模型能力越强，工程师的品味越重要。
date: 2026-10-05T13:06:22+08:00
draft: false
categories:
  - Engineering
---

# 3 从 README 到接口：AI 协作中的工程判断

## 模型越强，工程师的品味越重要

随着模型能力的提升，工程师的品味会越来越重要。AI 可以快速写出代码，工程师则需要判断采用什么方案、怎样组织模块、接口应该暴露什么。这些选择决定了软件最终的质量。

我理解的工程品味，是对这些选择的判断力：看到一个设计，能理解它为什么这样做；面对自己的问题，也能做出合适的取舍。模型越能实现我们的想法，我们对这些想法的判断就越重要。

## 积累品味

提升品味，我觉得一个很直接的办法是读成熟项目。尤其是那些在 AI 编程普及之前就长期维护的 GitHub 仓库，可以看它的架构、模块划分，也可以从 README 入手，学习作者怎样组织和介绍一个项目。

### 例 1:  curl 的 README 

README 尽量简洁：介绍用途，写一点简单用法，有必要时加截图，再留一个详细文档的入口。我认同这种安排，读者能理解项目、开始使用，就已经很好了。

[curl 的 README](https://github.com/curl/curl/blob/master/README.md) 就很短。开头说明它通过 URL 与服务器传输数据，并列出支持的协议；使用、安装和 libcurl 的资料，都有各自的文档入口。

curl 的功能很多，README 仍然能保持简洁。我想从中学习的是内容的取舍：哪些信息值得放在最前面，哪些可以交给详细文档。以后写自己的 README，也可以先考虑读者需要知道什么。

###  Virtual Implementation方法论

> 先想自己会怎么做，再看成熟项目怎么做

阅读项目时，我想多做一步：遇到一个设计决策，先想如果是自己，会怎样处理，再去看项目的实际做法。这也是我对课程中 Virtual Implementation 的理解。

比较时，还需要理解项目面对的需求和约束。逐渐积累这些具体决策的经验，遇到相似问题时，才更有依据判断怎样做合适。

## 附录：一个 Git 彩蛋

在 PR 的描述中写上：

```text
fixed #3
```

当 PR 合并到默认分支，且仓库启用了自动关闭关联 issue 的设置时，GitHub 会自动关闭该仓库的 issue #3。具体规则见 [GitHub 官方说明](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)和[自动关闭设置](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-auto-closing-issues)。
