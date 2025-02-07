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

### 零值 Mutex 是有效的

零值 `sync.Mutex` 和 `sync.RWMutex` 是有效的。所以指向 mutex 的指针基本是不必要的。

**Bad**

```go
mu := new(sync.Mutex)
mu.Lock()
```

**Good**

```go
var mu sync.Mutex
mu.Lock()
```

如果你使用结构体指针，mutex 应该作为结构体的非指针字段。即使该结构体不被导出，也不要直接把 mutex 嵌入到结构体中。

**Bad**

```go
type SMap struct {
  sync.Mutex // 直接嵌入 sync.Mutex

  data map[string]string
}

func NewSMap() *SMap {
  return &SMap{
    data: make(map[string]string),
  }
}

func (m *SMap) Get(k string) string {
  m.Lock()
  defer m.Unlock()

  return m.data[k]
}
```

1. **接口不清晰**：`sync.Mutex` 的方法（如 `Lock` 和 `Unlock`）会成为 `SMap` 的公共 API 的一部分，这可能导致调用者误用互斥锁。\

2. **实现细节泄露**：互斥锁是实现细节，不应该暴露给调用者。

在这种设计中，`sync.Mutex` 是结构体的匿名字段。由于 `sync.Mutex` 是导出的（因为它以大写字母开头），因此其所有方法（如 `Lock` 和 `Unlock`）也会成为 `SMap` 的导出方法。

这意味着调用者可以直接访问并操作 `sync.Mutex`，而不仅仅通过 `SMap` 提供的方法。就像下面这样：

```go
// 调用者可以直接调用 Lock 和 Unlock 方法
smap.Lock()
defer smap.Unlock()
```

**Good**

```go
type SMap struct {
  mu sync.Mutex

  data map[string]string
}

func NewSMap() *SMap {
  return &SMap{
    data: make(map[string]string),
  }
}

func (m *SMap) Get(k string) string {
  m.mu.Lock()
  defer m.mu.Unlock()

  return m.data[k]
}
```

1. **封装性增强**：锁作为实现细节被隐藏起来，调用者无法直接操作锁。

2. **更清晰的 API**：`SMap` 的导出方法（如 `Get`）是唯一的操作入口，调用者只需要关注业务逻辑，而不用关心底层的同步机制。

在这种设计中，`sync.Mutex` 是结构体的一个显式字段（`mu`）。由于 `mu` 是小写字母开头的字段，它不会被导出。这意味着调用者无法直接访问 `mu`，只能通过 `SMap` 提供的方法（如 `Get` 和可能的 `Set`）来操作。

### 在边界处拷贝 Slices 和 Maps

slices 和 maps 包含了指向底层数据的指针，因此在需要**复制它们**时要特别注意。

#### 接收 Slices 和 Maps

请记住，当 map 或 slice 作为函数参数传入时，如果您存储了对它们的引用，则用户可以对其进行修改。

**Bad**

```go
func (d *Driver) SetTrips(trips []Trip) {
  d.trips = trips
}

trips := ...
d1.SetTrips(trips)

// 你是要修改 d1.trips 吗？
trips[0] = ...
```

**Good**

```go
func (d *Driver) SetTrips(trips []Trip) {
  d.trips = make([]Trip, len(trips))
  copy(d.trips, trips)
}

trips := ...
d1.SetTrips(trips)

// 这里我们修改 trips[0]，但不会影响到 d1.trips
trips[0] = ...
```

#### 返回 slices 或 maps

同样，请注意用户对暴露内部状态的 map 或 slice 的修改。

**Bad**

```go
type Stats struct {
  mu sync.Mutex

  counters map[string]int
}

// Snapshot 返回当前状态。
func (s *Stats) Snapshot() map[string]int {
  s.mu.Lock()
  defer s.mu.Unlock()

  return s.counters
}

// snapshot 不再受互斥锁保护
// 因此对 snapshot 的任何访问都将受到数据竞争的影响
// 影响 stats.counters
snapshot := stats.Snapshot()
```

**Good**

```go
type Stats struct {
  mu sync.Mutex

  counters map[string]int
}

func (s *Stats) Snapshot() map[string]int {
  s.mu.Lock()
  defer s.mu.Unlock()

  result := make(map[string]int, len(s.counters))
  for k, v := range s.counters {
    result[k] = v
  }
  return result
}

// snapshot 现在是一个拷贝
snapshot := stats.Snapshot()
```

### 使用 defer 释放资源

使用 defer 释放资源，诸如文件和锁。

**Bad**

```go
p.Lock()
if p.count < 10 {
  p.Unlock()
  return p.count
}

p.count++
newCount := p.count
p.Unlock()

return newCount

// 当有多个 return 分支时，很容易遗忘 unlock
```

**Good**

```go
p.Lock()
defer p.Unlock()

if p.count < 10 {
  return p.count
}

p.count++
return p.count

// 更可读
```

Defer 的开销非常小，只有在您可以证明函数执行时间处于纳秒级的程度时，才应避免这样做。使用 defer 提升可读性是值得的，因为使用它们的成本微不足道。尤其适用于那些不仅仅是简单内存访问的较大的方法，在这些方法中其他计算的资源消耗远超过 `defer`。

### Channel 的 size 要么是 1，要么是无缓冲的

channel 通常 size 应为 1 或是无缓冲的。默认情况下，channel 是无缓冲的，其 size 为零。任何其他尺寸都必须经过严格的审查。我们需要考虑如何确定大小，考虑是什么阻止了 channel 在高负载下和阻塞写时的写入，以及当这种情况发生时系统逻辑有哪些变化。(翻译解释：按照原文意思是需要界定通道边界，竞态条件，以及逻辑上下文梳理)

**Bad**

```go
// 应该足以满足任何情况！
c := make(chan int, 64)
```

**Good**

```go
// 大小：1
c := make(chan int, 1) // 或者
// 无缓冲 channel，大小为 0
c := make(chan int)
```

### 枚举从 1 开始

在 Go 中，枚举类型的实现没有专门的关键字（如 `enum`），而是通过组合 `const` 和 `iota` 来实现。

#### 枚举的基本实现

`iota` 是 Go 中的一个预定义常量，代表自动递增的整数值。在 `const` 块中使用 `iota`，可以很方便地生成枚举值。

```go
type Status int

const (
    Pending Status = iota // iota的值为0
    Active                 // iota的值为1
    Completed              // iota的值为2
)
```

- `Pending` 的值为 `0`。

- `Active` 的值为 `1`。

- `Completed` 的值为 `2`。

#### 始于 1

如果希望枚举值从 `1` 开始，可以通过对 `iota` 进行简单的算术运算：

```go
type Status int

const (
    Pending Status = iota + 1 // iota的值为0，经过加法后变为1
    Active                 // iota的值为1，变为2
    Completed              // iota的值为2，变为3
)
```

