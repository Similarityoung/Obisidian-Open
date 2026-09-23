---
title: Zinx 学习记录
type: notes
slug: go-zinx-study-notes
summary: "借 Zinx 的接口、函数类型和 Worker 队列示例理解 Go 代码组织。"
tags:
  - learn
categories:
  - Go
date: 2024-09-24T15:13:40+08:00
draft: false
---

# Zinx 学习记录

## NewServer 为什么返回接口

```go
/* 创建一个服务器句柄 */
func NewServer (name string) ziface.IServer {
	s:= &Server {
	Name :name, IPVersion:"tcp4", IP:"0.0.0.0", Port:7777, }
	return s
}
```

这个接口限定了调用者可见的服务器能力，也便于替换实现或在测试中使用 mock。是否返回接口要看框架的边界，不必把它推广成所有构造函数都必须遵循的规则。

## 用函数类型传入处理逻辑

`ProcessFunc` 规定输入和输出；`applyToStrings` 负责遍历，具体处理逻辑由调用者提供。

```go
package main

import (
    "fmt"
)

// 定义ProcessFunc类型
type ProcessFunc func(input string) int

// 实现一个计算字符串字节数的ProcessFunc
func countBytes(s string) int {
    return len(s)
}

// 实现一个返回固定值的ProcessFunc
func fixedValue(s string) int {
    return 42
}

// applyToStrings 接受一个ProcessFunc和字符串切片，应用函数到每个字符串
func applyToStrings(f ProcessFunc, inputs []string) []int {
    results := make([]int, len(inputs))
    for i, s := range inputs {
        results[i] = f(s)  // 应用ProcessFunc到每个字符串
    }
    return results
}

func main() {
    strings := []string{"hello", "world", "go", "programming"}

    // 使用countBytes函数
    lengths := applyToStrings(countBytes, strings)
    fmt.Println("字符串字节数：", lengths)

    // 使用fixedValue函数
    values := applyToStrings(fixedValue, strings)
    fmt.Println("固定值：", values)
}

```

这里的 `len(s)` 统计字节数。示例中的英文字符串恰好与字符数相同，中文字符串不能这样等同。

## Worker 队列初始化

先创建 channel 切片，再初始化每个 channel；仅创建切片时，各元素仍然是 `nil`。

```go
var workerPool = make([]chan ziface.IRequest, 10) // 创建一个包含10个通道的切片
```

```go
for i := range workerPool {
    workerPool[i] = make(chan ziface.IRequest, 5)  // 初始化每个通道，容量为5
}
```

## 测试文件

测试文件与被测代码放在同一目录，文件名以 `_test.go` 结尾。例如 `calc.go` 对应 `calc_test.go`。
