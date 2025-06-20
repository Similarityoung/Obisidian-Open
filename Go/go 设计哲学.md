---
title: go 设计哲学
tags:
  - learn
categories:
  - Go
date: 2025-06-20T15:46:26+08:00
draft: true
---
## Go 的一些理解

### 如何解决循环依赖（Circular Dependency）

#### 什么是循环依赖

- `package a` 导入了 `package b`
- `package b` 又反过来导入了 `package a`

```txt
  a.go           b.go
+--------+     +--------+
| package| --> | package|
|   a    |     |   b    |
|        | <-- |        |
+--------+     +--------+
```

依赖循环是设计的问题，如果遇到依赖的情况，需要重新思考该如何对项目进行设计。

#### 解决循环依赖

