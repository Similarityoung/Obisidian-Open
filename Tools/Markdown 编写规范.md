---
title: Markdown 编写规范
tags:
  - md
categories:
  - Tools
date: 2024-09-24T13:19:50+08:00
draft: false
---

# Markdown 编写规范

这份笔记摘自 FEX 风格规范，并保留常用写作参考。

## 常用格式

- 使用 UTF-8 编码和 `.md` 扩展名。
- 用 `#` 表示标题，按层级使用 `##`、`###`；标题后留一个空行。
- 代码使用围栏，并标明语言。
- 并列信息用列表，需要比较时再用表格。
- 中英文和数字间适当留空格，中文语句使用中文标点。

````markdown
# 文档标题

## 章节

正文。

```go
fmt.Println("hello")
```
````

FEX 原规范还约定小写连字符文件名和特定标题写法，这些属于该项目的风格选择。

## 表达

一段说清一个主要意思。使用主动语态，删掉不必要的词，并列内容保持相同结构。先交代问题和结论，再补充例子与依据。

## 编辑快捷键

下面是常见 Windows 编辑器中的按键，具体行为以编辑器设置为准：

- `Home` / `End`：跳到行首 / 行尾。
- `Ctrl + ← / →`：按词移动。
- `Ctrl + Home / End`：跳到文档开头 / 结尾。
- `Page Up / Page Down`：向前 / 后翻页。

## 参考

- [FEX 风格规范](https://github.com/fex-team/styleguide)
- [Google Markdown 规范](https://github.com/google/styleguide/blob/gh-pages/docguide/style.md)
- [GitHub Flavored Markdown](https://help.github.com/articles/github-flavored-markdown)
- [中文排版指南](https://github.com/sparanoid/chinese-copywriting-guidelines)
