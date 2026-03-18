---
title: golang 面试
aliases:
  - Go 面试
  - Golang 面试题
tags:
  - go
  - 面试
  - moc
categories:
  - Go
date: 2026-03-17
draft: false
---

# golang 面试

> [!note]
> 这页现在只保留总入口。原来的内容已经拆成“语言基础”和“并发编程与同步控制”两篇，后续继续补充时也建议按这两个维度归档。

## 目录

- [[Go/golang 面试 - 语言基础]]
  主题：slice、map。
- [[Go/golang 面试 - 并发编程与同步控制]]
  主题：channel、context、sync、并发模型设计。
- [[Go/golang 面试 - 运行时 (Runtime)]]
  主题：GMP、调度器、运行时机制。

## 使用建议

- 先看 [[Go/golang 面试 - 语言基础]]，再看 [[Go/golang 面试 - 并发编程与同步控制]]。
- 第三篇建议看 [[Go/golang 面试 - 运行时 (Runtime)]]，把 GMP、调度器和运行时细节补齐。
- 如果后面继续整理语法、内存模型、接口、GC 等内容，优先归到“语言基础”。
- 如果后面继续整理 goroutine 调度、锁、channel、context、并发架构设计，优先归到“并发编程与同步控制”。
- 如果后面继续整理 GMP、sysmon、抢占、调度器、内存分配器、GC 协作等内容，优先归到“运行时（Runtime）”。
