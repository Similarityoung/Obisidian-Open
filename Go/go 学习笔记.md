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

#### 函数

##### 返回值

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

##### import

golang里面有两个保留的函数：init函数（能够应用于所有的package）和main函数（只能应用于package main）。这两个函数在定义时不能有任何的参数和返回值。  
  
虽然一个package里面可以写任意多个init函数，但这无论是对于可读性还是以后的可维护性来说，我们都强烈建议用户在一个package中每个文件只写一个init函数。  
  
go程序会自动调用init()和main()，所以你不需要在任何地方调用这两个函数。每个package中的init函数都是可选的，但package main就必须包含一个main函数。  
  
程序的初始化和执行都起始于main包。  
  
如果main包还导入了其它的包，那么就会在编译时将它们依次导入。有时一个包会被多个包同时导入，那么它只会被导入一次（例如很多包可能都会用到fmt包，但它只会被导入一次，因为没有必要导入多次）。  
  
当一个包被导入时，如果该包还导入了其它的包，那么会先将其它包导入进来，然后再对这些包中的包级常量和变量进行初始化，接着执行init函数（如果有的话），依次类推。  
  
等所有被导入的包都加载完毕了，就会开始对main包中的包级常量和变量进行初始化，然后执行main包中的init函数（如果存在的话），最后执行main函数。下图详细地解释了整个执行过程：

![[image-20240830200220684.png]]

导入时候的记得要加路径，从项目最开始的地方开始

`import _ "fmt"`给 `fmt` 包起别名，匿名，无法使用当前包的方法，但是会执行当前包内部的`init()` 方法

`import aa "fmt"`给 `fmt` 包起别名aa， `fmt.Println` 可以直接用 `aa.Println` 代替

`import . "fmt"`将当前fmt 包中的全部方法，导入到当前本包中，fmt 包中的所有方法可以直接使用 API 进行调用，无需使用 `fmt.API` 的形式


