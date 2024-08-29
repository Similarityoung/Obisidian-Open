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


var x, y int

var ( //这种分解的写法,一般用于声明全局变量

a int

b bool

)
  
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

#### 常量声明

```go
package main
import "unsafe" 
const ( a = "abc" b = len(a) c = unsafe.Sizeof(a) ) 
func main(){
println(a, b, c) 
}
```

可以使用关键字`iota`在 const() 里，用来进行累加的

```go
const (

Apple, Banana = iota + 1, iota + 2

Cherimoya, Durian

Elderberry, Fig

)
```

#### 函数返回值

```go
package main  
  
import "fmt"  
  
func foo1(a string, b int) int {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    return c  
}  
  
// 可以返回多个返回值，匿名  
func foo2(a string, b int) (int, int) {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    return c, c  
}  
  
// 可以返回多个返回值，有形参名称  
func foo3(a string, b int) (r1 int, r2 int) {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    r1 = c  
    r2 = c * 2  
  
    return  
}  
  
// 形参名称可以一起定义，都有默认值 0func foo4() (r1, r2 int) {  
    r1 = 1  
    r2 = 2  
    return  
}  
  
func main() {  
  
    c := foo1("hello", 100)  
    fmt.Println(c)  
  
    ret1, ret2 := foo2("hello", 100)  
    fmt.Println("ret1:", ret1, "ret2:", ret2)  
  
    ret1, ret2 = foo3("hello", 100)  
    fmt.Println("ret1:", ret1, "ret2:", ret2)  
}
```

