---
title: go 学习笔记
tags: [go,learn]
categories: [Back]
date: 2024-08-29T14:09:53+08:00
draft: true
---
### GoLang语法新奇

golang 中的表达式，加";"与不加都可以，建议不加

另外函数方法中的{}，符合 java 中的标准，需要放在函数名后面

#### 变量声明

```go
package main  
  
import "fmt"  
  
/*  
四种变量声明方式  
*/  
  
func main() {  
    //声明变量 默认为 0    var a int  
    fmt.Println("a = ", a)  
  
    // 方法二 声明变量，并初始化  
    var b int = 100  
    fmt.Println("b = ", b)  
  
    //方法三 （不推荐） 初始化省去数据类型，通过值来自动匹配数据类型  
    var c = 100  
    fmt.Println("c = ", c)  
  
    // 方法四：（最常用的方法）,只能用在函数体内  
    e := 100  
    fmt.Println("e = ", e)  
    fmt.Printf("type of e = %T", e)  
}
```

