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

##### 方法接收者应该选择值类型还是指针类型？

**应该选择指针类型接收者**，原因：

1. 使用指针接收者意味着支持修改接收者指向的值
2. 避免方法调用时，由值复制带来的内存&性能问题

#### 永远不要使用指向interface的指针

这个是没有意义的。在go语言中，接口本身就是引用类型，换句话说，接口类型本身就是一个指针。

```go
type myinterface interface{
	print()
}
func test(value *myinterface){
	//someting to do ...
}

type mystruct struct {
	i int
}
//实现接口
func (this *mystruct) print(){
	fmt.Println(this.i)
	this.i=1
}
func main(){
m := &mystruct{0}
test(m)//错误
test(*m)//错误
}
```

对于我的需求，其实test的参数只要是myinterface就可以了，只需要在传值的时候，传mystruct类型（也只能传mystruct类型）

### Interface 合理性验证

> 在实现接口时，养成习惯使用这种显式的编译时检查。
> 
> 如果类型是结构体，用 `var _ 接口 = 结构体{}`。
> 
> 如果类型是指针，用 `var _ 接口 = (*结构体)(nil)`。
> 
> 即使接口是正确的，这种检查也不会产生任何运行时开销。

为了在编译时就验证接口是否被正确实现

```go
var _ http.Handler = (*Handler)(nil)
```

#### 编译时的显式检查分析：

- `(*Handler)(nil)` 是一个 `nil` 的 `*Handler` 指针。

- `var _ http.Handler = (*Handler)(nil)` 的作用是将 `*Handler` 赋值给一个 `http.Handler` 类型的变量。编译器会在这个赋值过程中检查 `*Handler` 是否实现了 `http.Handler` 接口。

- 如果 `*Handler` 没有实现 `http.Handler`，编译器会在编译阶段直接报错，而不会等到运行时才发现问题。

#### 接口合理性验证的背景

在 Go 中，接口是一种契约（contract），规定了一个类型应该具备哪些方法。例如，`http.Handler` 接口定义如下：

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

如果你有一个自定义类型（如 `Handler`），你需要确保它实现了 `ServeHTTP` 方法，才能被视为实现了 `http.Handler` 接口。通常情况下，Go 语言会在运行时隐式地进行这种检查，但这种方式有风险：如果类型没有正确实现接口，问题可能在运行时才被发现，这对调试和维护很不利。

因此，Go 提供了一种机制，通过编译时的显式检查来确保类型是否实现了某个接口。

#### Bad 示例

以下是文档中的 `Bad` 示例：

```go
type Handler struct {
  // ...
}

func (h *Handler) ServeHTTP(
  w http.ResponseWriter,
  r *http.Request,
) {
  // ...
}
```

在这个例子中，`Handler` 结构体实现了 `ServeHTTP` 方法，理论上应该实现 `http.Handler` 接口。然而，这段代码没有显式地验证这一点。如果 `Handler` 的方法签名与接口不匹配（比如方法名拼写错误，或者参数类型不匹配），这些错误只有在运行时才会被发现，这对开发来说是不可接受的。

#### Good 示例

```go
type Handler struct {
  // ...
}
// 用于触发编译期的接口的合理性检查机制
// 如果 Handler 没有实现 http.Handler，会在编译期报错
var _ http.Handler = (*Handler)(nil)
func (h *Handler) ServeHTTP(
  w http.ResponseWriter,
  r *http.Request,
) {
  // ...
}
```

在这里就可以进行检测了

