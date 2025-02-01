---
title: Zinx 框架学习笔记
tags:
  - learn
categories:
  - Go
date: 2024-09-24T15:13:40+08:00
draft: false
---
### 函数返回接口而不是具体的结构体

Q: 为什么返回接口 IServer 而不是 server

```go
/* 创建一个服务器句柄 */ 
func NewServer (name string) ziface.IServer { 
	s:= &Server {
	Name :name, IPVersion:"tcp4", IP:"0.0.0.0", Port:7777, }
	return s 
}
```

A : `NewServer` 函数返回一个 `ziface.IServer` 类型的接口而不是直接返回 `Server` 类型的结构体，这种设计方式具有几个优点：

1. **抽象化**：返回一个接口而不是具体的结构体可以抽象化组件之间的交互。使用接口可以隐藏具体实现的细节，使得调用者只需要关心接口提供的方法。这样，如果未来需要改变具体的实现，只要新的实现符合接口的定义，调用代码不需要做任何修改。
    
2. **灵活性和扩展性**：使用接口使得代码更加灵活和易于扩展。比如，如果你想实现一个具有不同特性的服务器，只需创建一个新的结构体，实现相同的接口。这样你可以在不修改现有代码的情况下，为系统引入新的功能。
    
3. **依赖倒置原则**：这是面向对象设计原则之一，主张高层模块不应该依赖低层模块，它们都应该依赖于抽象。接口作为一种高级的抽象，确保了系统各个部分的低耦合性，增加了代码的稳定性。
    
4. **测试和模拟**：使用接口可以更容易地进行单元测试。你可以创建一个或多个模拟（mock）对象来实现同一接口，这样就可以在不涉及具体服务器实现的情况下测试系统的其他部分。
    

因此，返回 `ziface.IServer` 接口而不是具体的 `Server` 结构体，在软件工程中是一种常见且有益的做法，特别是在构建需要高度维护和扩展性的大型软件系统时。这种方式提供了更好的解耦和更灵活的代码管理策略。

### 函数定义的使用

函数类型的定义在编程中非常有用，尤其在Go语言这样的类型安全语言中，它提供了一系列的好处，这些好处涵盖了代码的可维护性、灵活性和可重用性等方面：

1. **代码复用**：
    
    - 通过定义一种函数签名，可以创建多个遵循相同模式的函数，这有助于统一接口和减少重复代码。这意味着你可以编写高度模块化的代码，其中特定的功能可以由符合同一签名的不同函数实现。
2. **实现抽象和封装**：
    
    - 函数类型的定义允许程序员封装复杂的逻辑，并通过简单的接口暴露功能，使得其他部分的代码不必了解背后的细节就能使用该功能。这有助于降低程序各部分之间的耦合度。
3. **提高灵活性**：
    
    - 函数类型作为参数传递或作为返回类型使用时，可以使代码更加灵活。开发者可以根据具体的需要传入不同的函数实现，例如在处理不同类型的网络请求时，可以根据请求的类型动态选择合适的处理函数。
4. **便于维护和扩展**：
    
    - 函数类型定义使得未来的修改和扩展变得更容易。如果需要修改功能，只需替换或修改实现了该函数类型的具体函数，而不需修改依赖于该类型的代码。这样做减少了对现有代码的干扰，降低了引入新错误的风险。
5. **支持回调和高阶函数**：
    
    - 函数类型的定义是实现回调机制的基础。在Go中，经常会用到回调来处理异步事件、定时任务或在框架中允许用户代码介入框架运行。同时，函数类型的定义是实现高阶函数（接受函数为参数或返回函数的函数）的关键，这在功能编程风格中非常有用。
6. **类型安全**：
    
    - 函数类型提供了类型安全的好处，确保函数的使用者传递正确类型的参数，返回预期类型的数据。这在编译时就能捕捉到许多可能的错误，提高程序的健壮性。

panic
#### 具体使用方法

以下是一个使用 `ProcessFunc` 类型函数作为参数的示例，该函数将遍历一个字符串切片，并使用传入的 `ProcessFunc` 类型函数处理每个字符串，然后将结果收集并返回。

首先，我们有一个 `ProcessFunc` 类型定义，如之前所述：

```go
type ProcessFunc func(input string) int
```

现在，我们将创建一个函数 `applyToStrings`，它接受一个 `ProcessFunc` 类型的函数和一个字符串切片，应用该函数到每个字符串，并收集结果：

```go
package main

import (
    "fmt"
)

// 定义ProcessFunc类型
type ProcessFunc func(input string) int

// 实现一个计算字符串长度的ProcessFunc
func countCharacters(s string) int {
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
    
    // 使用countCharacters函数
    lengths := applyToStrings(countCharacters, strings)
    fmt.Println("字符串长度：", lengths)
    
    // 使用fixedValue函数
    values := applyToStrings(fixedValue, strings)
    fmt.Println("固定值：", values)
}

```

在这个例子中：

- `countCharacters` 函数计算每个字符串的长度。
- `fixedValue` 函数对每个输入返回固定的值 `42`。
- `applyToStrings` 函数接受一个 `ProcessFunc` 和一个字符串数组，然后将该函数应用于数组中的每个字符串。

最后，我们在 `main` 函数中调用 `applyToStrings` 两次，分别使用 `countCharacters` 和 `fixedValue` 作为参数。这演示了如何使用函数类型参数来提供不同的行为而不改变 `applyToStrings` 函数的代码结构。

### go 单元测试

Go 语言推荐测试文件和源代码文件放在一块，测试文件以 `_test.go` 结尾。比如，当前 package 有 `calc.go` 一个文件，我们想测试 `calc.go` 中的 `Add` 和 `Mul` 函数，那么应该新建 `calc_test.go` 作为测试文件。

### channel 数组的使用方法

创建 `channel` 数组

```go
var workerPool = make([]chan ziface.IRequest, 10) // 创建一个包含10个通道的数组
```

给每个 `channel` 设置缓存大小

```go
for i := range workerPool {
    workerPool[i] = make(chan ziface.IRequest, 5)  // 初始化每个通道，容量为5
}
```

