---
title: Uber Go Style Guide
tags: [style guide]
categories: [Go]
date: 2025-02-01T19:49:07+08:00
draft: true
---
### 指向 interface 的指针

您几乎不需要指向接口类型的指针。您应该将接口作为值进行传递，在这样的传递过程中，实质上传递的底层数据仍然可以是指针。

如果希望接口方法修改基础数据，则必须使用指针传递 (将对象指针赋值给接口变量)。

补充：
#### 方法集（Method Set）

![image.png](https://img.simi.host/20250201195235.png)

> 规则：
> 
> 1. 类型的值的方法集只包含值接收者声明的方法
>     
> 2. 指向 T 类型的指针的方法集既包含值接收者声明的方法，也包含指针接收者声明的方法

##### 示例1：值类型与指针类型的方法调用

```go
type Cat struct{ Name string }

// 指针接收者方法
func (c *Cat) Meow() { fmt.Println(c.Name, "meows!") }

func main() {
    c1 := Cat{Name: "Whiskers"}
    // c1.Meow() // 编译错误！值类型无法调用指针接收者方法

    c2 := &Cat{Name: "Mittens"}
    c2.Meow() // 合法：指针类型可调用所有方法
}
```
##### 示例2：接口实现的严格性

```go
type Speaker interface { Speak() }

// 值接收者方法
func (c Cat) Speak() { fmt.Println("Meow") }

// 指针接收者方法
func (c *Cat) ChangeName(name string) { c.Name = name }

func main() {
    var s1 Speaker = Cat{}   // 合法：值类型包含Speak()
    var s2 Speaker = &Cat{}  // 合法：指针类型包含Speak()

    s1.Speak()
    s2.Speak()
    // s1.ChangeName("New") // 非法：接口未定义ChangeName，且s1是值类型
}
```
---

##### 方法名与接受者

另外，在 Go 语言中，**不能为同一个方法名同时定义值接收者和指针接收者**。

Go 语言不支持传统的方法重载（即同一作用域内同名方法的不同参数列表）。  对于方法接收者而言，**方法名和接收者类型**共同构成唯一标识。

值接收者（`T`）和指针接收者（`*T`）本质上是**两个不同的方法**。  

即使它们逻辑上实现相同的功能，Go 语言也禁止这种“重载”，因为方法名和接收者类型必须唯一。

##### 