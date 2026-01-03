---
title: 算法中go 的输入输出与一些简单结构
tags: []
categories: []
date: 2026-01-03T16:34:28+08:00
draft: true
---
## go 的输入与输出

在 Go 语言算法竞赛或大数据处理中，`fmt.Scan` 和 `fmt.Println` 由于使用反射导致性能较差，容易引发超时。实现高性能 I/O 的核心是利用缓冲机制：

### 1. 高性能输入 (Fast Input)

使用 `bufio.NewScanner(os.Stdin)` 替代标准输入函数。通过设置 `Split(bufio.ScanWords)`，扫描器可以自动跳过空格和换行符，直接获取目标字符串。获取字符串后，使用 `strconv.Atoi` 将其转换为整数，这种方式比直接扫描更快。

### 2. 高性能输出 (Fast Output)

使用 `bufio.NewWriter(os.Stdout)` 构建带缓冲的输出流。在写入时，配合 `fmt.Fprint` 或 `fmt.Fprintln` 将数据先存入缓冲区。**必须注意**：在程序结束前一定要调用 `Flush()` 方法，否则留在缓冲区的数据将无法写入文件或控制台。

### 模板

