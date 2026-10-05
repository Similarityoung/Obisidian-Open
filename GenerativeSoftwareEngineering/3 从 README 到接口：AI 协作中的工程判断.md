---
title: 3 从 README 到接口：AI 协作中的工程判断
type: notes
slug: generative-software-engineering
summary: "从 pi 1.0 的 README 和 edit 工具入手，思考文档取舍、接口约定与多 Agent 开发协作。"
date: 2026-10-05T13:06:22+08:00
draft: true
categories:
  - Engineering
---

# 3 从 README 到接口：AI 协作中的工程判断

这一讲里，我最想继续琢磨的是 README。说明项目能做什么，给出简单的使用方式，有直观效果时再放几张截图，详细资料留一个入口，我觉得就已经能成为一个不错的项目入口。

简洁的 README 需要判断哪些信息应该先出现、哪些可以留到后面。接口设计也需要类似的判断：调用者需要知道什么，哪些细节可以由模块内部处理。这是我想从 README 继续谈到接口和 AI 协作的原因。

## 从简洁的 README 学习工程品味

讲师提到，有些维护多年的老项目，README 很短，但看完以后，想继续了解的内容都有清楚的链接可以进入。我认同这种安排：README 帮助读者了解项目、开始尝试，具体配置和完整功能说明可以放到详细文档里。

阅读这样的 README，可以留意它如何安排第一次使用所需的信息：截图展示了什么效果？安装和使用示例能否让人直接尝试？遇到更复杂的需求，是否容易找到详细说明？

### 一个具体例子：pi 1.0 的 README

最近发布 1.0 的 pi，是我想拿来具体看看的例子。它是一个可以扩展的终端 AI Agent。我关注的是 [coding-agent 的 README](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/README.md)：它先用一句话说明用途，接着给出安装、启动和登录方式，再把完整使用说明交给详细文档。

以 npm 安装为例，README 标明需要 Node.js 22.19 或更高版本，并给出安装命令：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

然后进入项目目录，运行 `pi`，通过 `/login` 连接支持的订阅或 API key，就可以给它任务。更完整的配置与使用说明放在[文档入口](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/index.md)，演示则可以去 [pi.dev](https://pi.dev/) 看。

这份 README 没有放操作截图，但第一次使用所需的路径很清楚。我觉得值得学的是这种信息安排：先让我知道它有什么用、怎样开始，再告诉我后续去哪里找。截图或演示也应服务于这个目的，具体采用哪一种，要看它能否帮助读者理解工具。

### 把观察变成对 AI 的具体要求

工程品味体现在这些具体取舍里。觉得一个 README 清楚好用之后，还要能说出它为什么好，再把这种判断变成 AI 可以执行的要求。例如，对一个面向首次使用者的工具，可以提出这样的修改要求：

> 开头用一两句话说明工具的用途和运行前提，提供安装命令与一个可直接运行的最小示例。工具有直观效果时，放一张能说明效果的截图。详细参数放到独立文档，README 中保留入口。

这种要求给出了信息顺序、文档分工和可检查的结果。AI 能据此修改，我也能判断修改是否帮助读者完成第一次使用。

简洁仍然要围绕读者的需要。一个基础库可能需要先解释概念与使用边界，一个带界面的工具可能更适合先展示截图。保留多少内容，要看读者能否理解项目、开始使用并找到后续资料。

### Virtual Implementation 的比较过程

**Virtual Implementation 的重点是先形成自己的方案，再与成熟实现比较。** GitHub 提供真实工程样本，这个方法帮助读者理解样本背后的取舍。

1. 根据问题和约束，先构思自己的实现或内容安排。
2. 查看成熟项目的做法，找出具体差异。
3. 追问差异背后的理由，判断它解决了什么问题。
4. 比较各自在当前目标和约束下的得失，修正自己的方案。

以 pi 的 README 为例，可以先设想一个终端 Agent 的介绍应该包含哪些内容，再对照它的实际文档：我是否会把所有配置都塞进 README？是否会忘记登录这一步？哪些内容可以通过链接交给详细文档？向 AI 提问时，也应带上这些具体差异和读者背景，让解释围绕真实取舍展开。

同样的方法可以用于阅读接口：先设想调用者需要哪些能力、必须知道哪些约束，再与项目的接口比较。学习所得应包含采用某种设计的理由，以及这些理由成立的条件。

## 接口设计与多 Agent 协作

接口是调用者正确使用模块时必须知道的全部约定，包括输入输出、数据含义、错误、副作用、使用顺序和必要的性能约束。接口说明足够清楚，模块才更容易被独立实现、使用和验证。

### 一个具体例子：pi 的 edit 工具

继续看 pi 1.0 的[内置 edit 工具](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/edit.ts)。模型调用它时，提供文件路径 `path` 和修改列表 `edits`，每项修改包含要寻找的 `oldText` 和替换后的 `newText`。例如，一次修改 README 中的一段说明，可以给出这样的参数：

```json
{
  "path": "README.md",
  "edits": [
    {
      "oldText": "运行 pi 即可开始。",
      "newText": "运行 pi，通过 /login 登录后即可开始。"
    }
  ]
}
```

这个输入看起来很简单，但正确使用它还需要知道行为约定：每段 `oldText` 都要在原文件中唯一匹配，多项修改的范围不能重叠，而且所有匹配都基于修改前的文件。因此，后一项修改不能依赖前一项刚写入的内容。

这让我觉得，接口是否清楚，不能只看参数类型。调用者还要知道这些参数怎样被解释，失败时会发生什么，以及成功后会修改哪个文件。实现可以把匹配、替换和差异计算放在内部，但这些影响调用结果的约定需要明确写出来。

### 根据结果的使用者安排输出

edit 的成功结果里，有两个值得留意的字段：

| 字段 | 在 edit 结果中的内容 | 用途 |
|---|---|---|
| `content` | 简短的成功说明，包括替换的块数和文件路径 | 返回给模型，帮助它继续执行任务 |
| `details` | 用于展示的 `diff`、标准 unified patch，以及可选的 `firstChangedLine` | 为日志和界面提供结构化结果 |

这里的 `firstChangedLine` 指修改后文件中第一处变化所在的行，可以用于定位。`content` 与 `details` 的用途也写在了底层 [AgentToolResult 的类型说明](https://github.com/earendil-works/pi/blob/v1.0.0/packages/agent/src/types.ts)里。

我觉得这个设计很具体：模型需要知道操作结果，用户需要查看改动，日志也需要保留可处理的信息。这些需求通过同一次执行的结果得到满足。界面有了结构化的差异数据，就不用从一句成功说明中再猜出文件改了什么。

### 把编辑执行和结果展示分开

pi 将 edit 的[渲染代码](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/tools/renderers/edit.ts)放在单独的文件中。展示最终结果时，渲染器读取 `details.diff` 等信息；负责编辑的代码处理文件修改并生成结果。显示组件需要知道怎样画出工具调用与结果，可以通过渲染接口工作。

对我来说，这样的分工比“拆成几个文件”更值得关注。调整差异的颜色、折叠方式和显示布局，可以集中在展示部分；修改编辑逻辑，则需要继续满足相同的输入与结果约定。边界清楚以后，每一方需要理解的内容就更少，内部实现也更容易独立变化。

这也给我一个判断接口的具体标准：它能否提供调用者所需的信息，同时把实现细节留在模块内部。John Ousterhout 的 [Modular Design 讲义](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=modularDesign)讨论了类似的信息隐藏与深模块设计；pi 的这个例子让我更容易把这些概念对应到实际代码。

### 先检验接口，再并行实现

如果让多个 Agent 开发一个类似的工具，可以让一方负责文件编辑，另一方负责结果展示。但在并行开发之前，需要先约定参数的匹配规则、成功结果的字段含义，以及失败怎样传递和显示。

我会先拿一份小文件和一组修改，走通一次完整过程：工具修改文件，模型收到结果，界面展示对应的差异。再检查找不到旧文本、出现多个匹配或修改范围重叠时，执行与展示双方是否按约定处理错误。这样比较容易发现问题究竟来自实现，还是接口本身说得不够清楚。

例如，即使双方都使用 `firstChangedLine: number`，如果一方认为它是原文件的行号，另一方认为它是修改后的行号，跳转位置仍然会出错。只统一类型，解决不了这种语义差异。

从 README 到接口，我想练习的都是这种具体判断：读者或调用者需要知道什么，哪些信息必须准确给出，哪些细节可以留在后面。AI 可以帮我写文档、实现模块，但这些取舍仍然需要我先想清楚，再变成它能执行、我能检查的要求。

## 后记彩蛋：GitHub 自动关闭 issue

在 PR 的描述正文中，可以通过关闭关键词关联 issue：

```text
fixed #3
```

`#3` 指该仓库编号为 3 的 issue。PR 合并到仓库的默认分支，且仓库启用了关联 PR 合并后自动关闭 issue 的设置时，GitHub 会自动关闭它。`fixes`、`close`、`closes` 等也是支持的关键词。

关闭关键词也可以写在 commit message 中，随提交进入默认分支时触发关闭。普通 PR 评论中的引用不等同于这种关闭关联。具体规则见 [GitHub 官方说明](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)和[自动关闭设置](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-auto-closing-issues)。
