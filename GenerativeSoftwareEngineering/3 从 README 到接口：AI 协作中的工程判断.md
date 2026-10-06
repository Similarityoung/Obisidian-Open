---
title: 3 从 README 到接口：AI 协作中的工程判断
type: notes
slug: generative-software-engineering
summary: "从 curl 的 README 和 pi 的工具接口入手，思考工程品味与 AI 协作。"
date: 2026-10-05T13:06:22+08:00
draft: true
categories:
  - Engineering
---

# 3 从 README 到接口：AI 协作中的工程判断

这一讲让我想继续琢磨 README。讲师提到，README 可以很简洁：说明用途，给出简单用法，有必要时放几张截图，再留一个详细文档的入口。我认同这种做法，读者能知道项目做什么、怎样开始，就已经很好了。

## 从 README 学习工程品味

### 一个具体例子：curl 的 README

[curl 的 README](https://github.com/curl/curl/blob/master/README.md) 开头说明它通过 URL 与服务器传输数据，并列出支持的协议。随后，使用方法指向 man page 和 everything curl，安装指向 INSTALL，库的使用指向 libcurl 文档。

curl 的功能很多，README 却很短。它把不同需求的入口列清楚，具体用法交给专门文档。这种取舍值得学：先让读者找到方向，再按需要深入。

### 把观察变成对 AI 的要求

“把 README 写好”太含糊。我更愿意把要求说具体：

> 开头说明用途，给出最简单的使用方式。需要展示效果时放截图，详细参数放到文档里，保留清楚的入口。

这样，AI 知道要改什么，我也能检查读者是否容易上手。工程品味需要落到这些取舍上。

课程里的 Virtual Implementation 也可以用在这里：先想自己会怎样写，再对照已有项目，看看它保留了什么、把什么放到了别处。比较以后，我才更容易说清楚自己为什么选择这样的安排。

## 从 pi 的工具接口看工程判断

README 要考虑读者需要知道什么，接口也要考虑调用者需要知道什么。最近发布 1.0 的 pi，正好提供了一个具体例子。

### edit：参数之外，还有行为约定

pi 1.0 的 [edit 工具](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/edit.ts)接收文件路径 `path` 和修改列表 `edits`，每项包含 `oldText` 与 `newText`。

参数之外，还有几条重要约定：旧文本必须在原文件中唯一匹配，各项修改不能重叠，所有匹配都基于修改前的文件。因此，后一项修改不能依赖前一项刚写入的内容。

我觉得，接口需要把数据含义、失败情况和副作用一起说明。

### 结果怎样交给模型和界面

edit 的成功结果中，有两个值得关注的字段：

| 字段 | 内容与用途 |
|---|---|
| `content` | 给模型的简短成功说明，包含替换块数和文件路径 |
| `details` | 给日志和界面的差异数据，包括 `diff`、`patch` 和可选的 `firstChangedLine` |

两类字段的用途也写在 [AgentToolResult 的类型说明](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/types.ts)里。模型据此继续任务，界面则能直接展示改动。

pi 将 edit 的[渲染代码](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/renderers/edit.ts)单独组织。展示最终结果时，渲染器读取 `details.diff` 等信息。编辑代码负责修改文件并生成结果，展示代码负责呈现结果。调整颜色、折叠或布局，就可以集中在展示部分。

## 接口清楚以后，再让多个 Agent 并行开发

如果让两个 Agent 开发类似的工具，一方负责编辑，一方负责展示，我会先约定匹配规则、结果字段和错误处理，再用一份小文件走通完整过程：文件被修改，模型收到结果，界面显示对应的差异。

例如，`firstChangedLine` 指修改后文件中第一处变化的行号。如果双方对它的理解不同，即使都写成 `number`，跳转位置仍会出错。找不到旧文本、出现多个匹配时如何处理，也需要事先说清楚。

我想练习的工程判断，就是把这些约定想清楚，再交给 AI 实现。分工能否成立，要看双方是否理解同一套接口。

## 后记彩蛋：GitHub 自动关闭 issue

在 PR 的描述正文中，可以通过关闭关键词关联 issue：

```text
fixed #3
```

`#3` 指该仓库编号为 3 的 issue。PR 合并到仓库的默认分支，且仓库启用了关联 PR 合并后自动关闭 issue 的设置时，GitHub 会自动关闭它。`fixes`、`close`、`closes` 等也是支持的关键词。

关闭关键词也可以写在 commit message 中，随提交进入默认分支时触发关闭。普通 PR 评论中的引用不等同于这种关闭关联。具体规则见 [GitHub 官方说明](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)和[自动关闭设置](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-auto-closing-issues)。
