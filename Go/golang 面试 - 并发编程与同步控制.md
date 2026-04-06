---
title: golang 面试：并发编程与同步控制
aliases:
  - Go 面试并发篇
  - Golang 并发编程与同步控制
tags:
  - go
  - 面试
  - 并发
  - channel
  - context
  - sync
categories:
  - Go
date: 2026-03-17
draft: false
---

# golang 面试：并发编程与同步控制

[[Go/golang 面试]]

## 1. channel（按当前 Go 运行时口径）

> [!note]
> 这一节重点记 `hchan`、缓冲区、等待队列、阻塞条件和 `close`/`panic` 语义。面试里如果要一句话概括，可以直接说：`channel = 带锁的同步结构 + 可选环形缓冲区 + sendq/recvq 等待队列`。

### 1.1 Channel 的底层结构：`hchan`

Go 运行时里，channel 的核心结构叫 **`hchan`**，实现位于 `runtime/chan.go`。

它的关键字段可以分成三类：

#### 环形缓冲区相关

- `buf`：缓冲区指针
- `dataqsiz`：缓冲区容量
- `qcount`：当前缓冲区里已有多少个元素
- `sendx`：下次发送写入的位置
- `recvx`：下次接收读取的位置

#### 等待队列

- `recvq`：等待接收的 goroutine 队列
- `sendq`：等待发送的 goroutine 队列

#### 状态与同步

- `closed`：是否已关闭
- `lock`：保护 channel 内部状态的锁

所以可以先把一个 channel 想成：

> 一个带锁的结构，里面可能有一个环形队列，还挂着两条等待链表：发送等待队列和接收等待队列。

### 1.2 什么是环形队列

有缓冲 channel 里的数据不是随便放的，而是放在一个**环形缓冲区**里。

- `sendx` 指向下一次发送应该写到哪里
- `recvx` 指向下一次接收应该从哪里读
- 到了数组末尾会绕回开头，所以叫环形队列

你可以把它想成一个圆形传送带：

- 发送时把数据写到 `sendx`
- 接收时从 `recvx` 取数据
- 指针一路往前走，走到末尾就回到开头

这也是 channel 能高效做 FIFO 的原因。

### 1.3 `sendq` 和 `recvq` 是什么

如果当前这次发送或接收**不能立刻完成**，对应 goroutine 就不会原地空转，而是会被挂到等待队列里：

- `sendq`：发送方暂时发不出去时，挂在这里
- `recvq`：接收方暂时收不到时，挂在这里

这两个队列里挂的不是值本身，而是等待中的 goroutine 相关信息。

所以 channel 不只是“一个缓冲区”，它还是一个**同步点**。

### 1.4 无缓冲 channel 和有缓冲 channel 的区别

#### 无缓冲 channel

无缓冲 channel 没有中间缓冲区，发送和接收必须**直接配对**。

也就是说：

- 发送时，必须同时有接收方准备好
- 接收时，必须同时有发送方准备好

Go 官方 Tour 对这个行为的总结很直接：默认情况下，发送和接收会阻塞，直到另一侧准备好。

所以无缓冲 channel 更像：

> 一次“当面交接”。你发的时候，对方得当场接走。

#### 有缓冲 channel

有缓冲 channel 有环形队列，可以先把值存进去。

- 只要缓冲区没满，发送就可以先成功，不必立刻等接收方
- 只要缓冲区不空，接收就可以直接取出，不必立刻等发送方

所以有缓冲 channel 更像：

> 一个带容量上限的收纳箱。发送方可以先放进去，接收方稍后再拿。

### 1.5 发送的几种情况

#### 情况 A：有等待中的接收者

如果 `recvq` 里已经有人在等接收，那么发送可以**直接把值交给那个接收者**，甚至不一定先经过缓冲区。

#### 情况 B：没有接收者，但缓冲区还有空位

如果是有缓冲 channel，且 `qcount < dataqsiz`，发送就把值写进环形队列，然后返回。

#### 情况 C：没有接收者，且缓冲区已满

这时发送不能立刻完成，发送 goroutine 会阻塞，并进入 `sendq` 等待。

### 1.6 接收的几种情况

#### 情况 A：有等待中的发送者

如果 `sendq` 里已经有发送者在等，那么接收可以直接从那个发送者拿到值。

#### 情况 B：缓冲区里有数据

如果 `qcount > 0`，接收就从环形队列当前位置读出一个元素，然后返回。

#### 情况 C：没有发送者，缓冲区也空

这时接收不能立刻完成，接收 goroutine 会阻塞，并进入 `recvq` 等待。

### 1.7 常见阻塞场景

这部分面试很爱问，可以直接背结论。

#### 向 `nil channel` 发送

会**永久阻塞**，因为 `nil` channel 根本没有底层 `hchan` 可操作。

#### 从 `nil channel` 接收

也会**永久阻塞**。

#### 无缓冲 channel 发送时没有接收者

会阻塞，直到有接收者出现。

#### 无缓冲 channel 接收时没有发送者

会阻塞，直到有发送者出现。

#### 有缓冲 channel 发送时缓冲区已满

会阻塞，直到有接收者取走数据腾出空间。

#### 有缓冲 channel 接收时缓冲区为空，且没有发送者

会阻塞，直到有新发送到来。

### 1.8 `close` 之后会发生什么

Go 内建 `close` 的语义可以概括成：

- channel 关闭后，**已经发进去但还没被接收的数据**，仍然可以继续被接收
- 当这些数据都取完后，再继续接收，会**立刻返回元素类型的零值**
- 用 `v, ok := <-ch` 时，这时 `ok` 会变成 `false`

所以关闭 channel 不是“把里面的数据清空”，而是：

> 表示不会再有新值发送进来。

### 1.9 哪些操作会 panic

#### 向已关闭的 channel 发送

一定会 panic。

#### 重复关闭一个 channel

会 panic，`close` 只能成功一次。

#### 关闭 `nil channel`

会 panic。

### 1.10 哪些操作不会 panic，但行为容易搞错

#### 从已关闭的 channel 接收

**不会 panic**。

它会先把缓冲区剩余值读完；读完后继续接收会立刻返回零值。

#### 对 `nil channel` 收发

**不会 panic**，但会一直阻塞。

### 1.11 一个很重要的运行时不变量

当前运行时源码在 `chan.go` 里写了几个不变量，其中两个很值得记：

- 对于有缓冲 channel，`qcount > 0` 意味着 `recvq` 为空
- 对于有缓冲 channel，`qcount < dataqsiz` 意味着 `sendq` 为空

这背后的直觉是：

- 缓冲区里已经有数据时，接收通常可以直接从缓冲区拿，不需要排队等
- 缓冲区还没满时，发送通常可以直接写进去，也不需要排队等

### 1.12 面试速答版

- channel 的底层核心结构是 `hchan`
- `hchan` 里既有缓冲区信息，也有 `sendq` / `recvq` 两条等待队列
- 无缓冲 channel 必须发送接收直接配对
- 有缓冲 channel 只在“满了不能发”或“空了不能收”时阻塞
- 向 `nil channel` 收发会永久阻塞
- 向已关闭 channel 发送、重复关闭 channel、关闭 `nil channel` 都会 panic
- 从已关闭 channel 接收不会 panic；数据读完后会立刻返回零值，且 `ok == false`

### 1.13 参考资料

- [runtime/chan.go](https://go.dev/src/runtime/chan.go)
- [runtime/chan.go 文本版](https://go.dev/src/runtime/chan.go?m=text)
- [A Tour of Go: Channels](https://go.dev/tour/concurrency/2)
- [A Tour of Go: Range and Close](https://go.dev/tour/concurrency/4)
- [Go 语言规范](https://go.dev/ref/spec)
- [builtin 包源码](https://go.dev/src/builtin/builtin.go?m=text)

## 2. context

> [!note]
> `context` 可以先理解成“一个随请求向下传递的控制器”。它最核心的作用是传递取消信号、超时/截止时间，以及少量请求级数据。

### 2.1 `context` 是干什么的

Go 标准库对 `context` 的定义很明确：

> `Context` 用来在 API 边界和进程之间传递 **截止时间（deadline）**、**取消信号（cancellation signal）** 和 **请求级别的值（request-scoped values）**。

你可以把它先理解成：

> 一个随请求向下传递的“控制器”，用来告诉下面所有 goroutine：“这活别干了”，“超时了”，“请求已经结束了”。

这也是它在“协程级联退出、超时控制”里特别关键的原因。

### 2.2 它为什么能控制“级联退出”

因为 `context` 是**有父子关系**的。

`WithCancel`、`WithDeadline`、`WithTimeout`、`WithValue` 都会基于一个父 `Context` 创建子 `Context`。而且：

> 当一个 `Context` 被取消时，所有从它派生出来的子 `Context` 也会一起被取消。

这就是“级联退出”的本质。

比如：

```text
reqCtx
 ├─ dbCtx
 ├─ cacheCtx
 └─ streamCtx
```

如果最上层 `reqCtx` 被取消：

- 数据库查询应该停
- 缓存回源应该停
- 流式输出应该停

不用你一个个手动通知，子 `Context` 会一起收到取消信号。

### 2.3 `Context` 最核心的 4 个能力

#### `Done() <-chan struct{}`

返回一个 channel。

当这个 `Context` 被取消、超时、到达 deadline 时，这个 channel 会被关闭。

所以在 goroutine 里最常见的写法就是：

```go
select {
case <-ctx.Done():
    return
default:
    // 继续工作
}
```

这就是“优雅退出”的关键。

#### `Err() error`

当 `Done` 关闭后，`Err()` 会告诉你为什么结束：

- 是被取消了
- 还是超时了

#### `Deadline() (time.Time, bool)`

返回截止时间以及是否设置过 deadline。

#### `Value(key any) any`

读取请求级别的数据。

但官方特别强调：**只用于 request-scoped data，不要拿它传普通业务参数。**

### 2.4 最常用的几个创建方式

#### `context.Background()`

最顶层、空白的根 `Context`。

通常 `main`、初始化逻辑、顶层请求入口会从它开始。

#### `context.TODO()`

也是一个占位根 `Context`。

常用于“这里以后要改，但现在还没决定传哪个 ctx”。

#### `context.WithCancel(parent)`

创建一个可手动取消的子 `Context`。

返回 `(ctx, cancel)`。调用 `cancel()` 后，这个 `ctx` 和它的子 `ctx` 都会被取消。

#### `context.WithTimeout(parent, d)`

创建一个带超时的子 `Context`。

时间一到自动取消。

#### `context.WithDeadline(parent, t)`

和 `WithTimeout` 类似，只是直接指定绝对时间点。

#### `context.WithValue(parent, key, val)`

往 `Context` 里塞请求级数据，但只能少量、谨慎地用。

### 2.5 为什么总说“要记得调用 cancel”

这是官方文档里非常重要的一点：

> 调用 `WithCancel` / `WithTimeout` / `WithDeadline` 后拿到的 `CancelFunc`，应该在所有控制路径上被调用。否则会让子 `Context` 及其关联资源一直挂着，直到父 `Context` 被取消。`go vet` 也会检查这个问题。

也就是说：

```go
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()
```

这个 `defer cancel()` 不只是“礼貌”，而是为了：

- 释放对子 `Context` 的引用
- 停掉相关 timer
- 避免资源泄漏

### 2.6 在 goroutine 级联退出里怎么用

这是 `context` 最经典的工程用途。

假设一个请求进来后，你启动了多个 goroutine：

- 一个拉模型流
- 一个写日志
- 一个写缓存
- 一个监听客户端断开

这时最上层请求一旦结束，就应该通知所有子 goroutine 收工。

标准做法就是把同一个 `ctx` 传下去，然后在每个 goroutine 里监听：

```go
for {
    select {
    case <-ctx.Done():
        return
    default:
        // do work
    }
}
```

这样：

- 用户取消请求
- 上游超时
- 服务端主动终止

都会沿着 `Context` 树往下传播。

### 2.7 为什么它对“大模型流式长输出”特别关键

这个场景和 `context` 天然契合。

#### 用户中途断开连接

比如前端正在接收模型流式输出，用户突然点了“停止生成”或者浏览器断开了。

这时服务端不能还继续：

- 向上游模型拉 token
- 拼接输出
- 持续写 socket
- 占着 goroutine 不放

正确做法是：HTTP 请求上下文一取消，下面负责拉流和转发的 goroutine 都通过 `ctx.Done()` 停掉。

#### 上游模型响应太慢

流式接口很容易遇到：

- 首 token 太慢
- 中途卡住
- 某一段网络阻塞

这时可以用：

```go
ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
defer cancel()
```

超过时间直接终止整条调用链。

#### 一个请求带出多个下游调用

比如用户问答时，你可能同时做：

- 模型流式生成
- RAG 检索
- 埋点
- 审计
- 计费

它们都应该挂在同一个请求 `ctx` 上。只要请求失效，整串工作都能停。

### 2.8 在网络请求拦截里为什么也关键

官方文档明确说：

> Incoming requests to a server should create a `Context`, and outgoing calls to servers should accept a `Context`.

翻成人话：

- **入站请求**：拿到请求时就应该有一个 `ctx`
- **出站请求**：你往下游 HTTP、RPC、DB 调用时，都应该把 `ctx` 继续传下去

所以在“网络请求拦截”或中间件场景里，`context` 很适合做两件事：

#### 超时拦截

给整条请求链加统一 timeout。

如果超时，就不用等所有下游慢慢返回，直接统一取消。

#### 主动取消

比如网关发现：

- 用户权限不够
- 风控命中
- 客户端断连
- 请求已无意义

直接 cancel 上层 `ctx`，下面所有基于这个 `ctx` 的调用都能跟着停。

### 2.9 `context` 和 channel 的关系

`ctx.Done()` 本质上就是一个 **只读 channel**：

```go
Done() <-chan struct{}
```

只要 `Context` 被取消，这个 channel 就会关闭。

所以它和 channel 模型结合得非常自然：

- goroutine 里 `select`
- 业务 channel 负责传数据
- `ctx.Done()` 负责通知退出

典型结构：

```go
select {
case msg := <-dataCh:
    // 处理数据
case <-ctx.Done():
    // 收到取消信号，退出
    return
}
```

这就是为什么 `context` 特别适合协调一组 goroutine 的生命周期。

### 2.10 `WithValue` 要谨慎

这块很容易被滥用。

官方源码和文档都明确强调：

> `Context` values 只应该用于**跨 API 边界、跨进程传递的 request-scoped data**，不要拿来传函数的可选参数。

正确例子通常是：

- trace id
- request id
- auth token
- 用户身份
- 日志链路字段

不推荐拿它塞：

- 业务配置
- 大对象
- 一堆可选参数

### 2.11 面试速答版

- `context` 的核心作用是向下传播取消信号、超时/截止时间，以及少量请求级数据
- `Context` 是有父子关系的，父 `Context` 取消后，子 `Context` 会级联取消
- 最核心的 4 个能力是 `Done`、`Err`、`Deadline`、`Value`
- 常用派生方式是 `WithCancel`、`WithTimeout`、`WithDeadline`、`WithValue`
- `WithCancel` / `WithTimeout` / `WithDeadline` 返回的 `cancel` 应该及时调用
- 在 goroutine 里最常见的退出方式是 `select { case <-ctx.Done(): return }`
- `ctx.Done()` 本质上是一个只读 channel，所以它和 goroutine、channel 能天然配合
- `WithValue` 只适合传 request-scoped data，不适合传普通业务参数

### 2.12 参考资料

- [context 包文档](https://pkg.go.dev/context)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
- [context 源码](https://go.dev/src/context/context.go)

## 3. sync：`Mutex`、`RWMutex`、`WaitGroup`

> [!note]
> 这三个原语的定位可以先一句话记住：`Mutex` 负责互斥，`RWMutex` 负责读写分离，`WaitGroup` 负责等待一组任务结束。

### 3.1 先记三者的定位

- `Mutex`：互斥，任何时刻只允许一个 goroutine 进入临界区
- `RWMutex`：读写锁，允许多个读者并发，但写者独占
- `WaitGroup`：不是锁，而是“等一组任务结束”的计数同步器

官方文档也提醒：大多数同步问题不必强行用 channel，适合用锁的时候，`Mutex` 往往更直接。

### 3.2 `Mutex`：什么时候用

当你要保护一段**共享可变状态**，而且读写逻辑并不天然适合消息传递时，用 `Mutex` 最直接。

典型场景包括：

- 保护 `map`
- 保护计数器
- 保护对象内部字段
- 保护缓存状态

`Mutex` 的几个基础点要记住：

- 零值可直接使用
- 使用后不能复制
- 锁不绑定某个 goroutine，A goroutine 上锁、B goroutine 解锁在语义上是允许的

最常见写法：

```go
mu.Lock()
defer mu.Unlock()
// 修改共享状态
```

如果临界区很短、读写比例没有明显“读远多于写”，通常优先用 `Mutex`，因为它语义简单，开销也更可控。

### 3.3 `RWMutex`：什么时候用

`RWMutex` 是读写锁，**可同时允许多个读者持有读锁，但写锁必须独占**。

它适合“读多写少”的场景，例如：

- 大量查询、少量更新的配置快照
- 热点缓存元数据
- 路由表

官方文档强调：一旦有 goroutine 调用了 `Lock` 请求写锁，后续新的 `RLock` 会被阻塞，直到写者拿到并释放锁，这是为了保证写者最终能获得锁。

这也带来几个面试高频点：

- `RWMutex` **不支持锁升级**，拿着读锁不能直接升级成写锁
- 不适合递归读锁，因为等待中的写者会阻止新的读锁进入
- 如果写操作并不少，或者临界区很短，`RWMutex` 反而可能不如 `Mutex`

经验上就是：

> 只有在“读特别多、写比较少”时再考虑 `RWMutex`；否则默认先用 `Mutex`。

### 3.4 `WaitGroup`：什么时候用

`WaitGroup` 用来等待一组 goroutine 或任务完成。

它不是互斥原语，不保护共享数据，只负责“计数到 0 时唤醒等待者”。

典型场景：

- main goroutine 等多个 worker 结束
- 并行批处理后统一汇总
- 服务关闭时等待后台任务优雅退出

当前文档里既给出了传统 `Add/Done/Wait` 用法，也给出了 `WaitGroup.Go` 这种直接启动任务的写法。

#### 传统写法

```go
var wg sync.WaitGroup
wg.Add(1)
go func() {
    defer wg.Done()
    // work
}()
wg.Wait()
```

#### 当前文档推荐的 `WaitGroup.Go`

```go
var wg sync.WaitGroup
wg.Go(func() {
    // work
})
wg.Wait()
```

要点可以记成：

- `WaitGroup.Go` 会启动一个新 goroutine
- 在启动前为任务计数加一
- 当函数返回时自动把计数减一
- 文档明确要求：传入的 `f` **不应该 panic**

### 3.5 `WaitGroup` 的易错点

当前文档里有几条非常容易考：

- **正数的 `Add` 应该发生在对应 goroutine 启动之前**，否则 `Wait` 可能先返回
- 一个 `WaitGroup` 若要复用到下一轮任务，新的 `Add` 必须发生在前一轮 `Wait` 返回之后
- `Add` 把计数加成负数会直接 `panic`
- `WaitGroup` 使用后不能复制

所以 `WaitGroup` 的重点不是“线程安全计数器”这几个字，而是：

> 它只负责协调“什么时候都结束了”，不负责保护共享数据。

### 3.6 `WaitGroup` 的底层要点

当前实现里，`WaitGroup` 内部有一个 64 位原子状态和一个信号量字段。

可以粗略理解为：

- 高 32 位是任务计数器
- 低位里有 waiter 数量和 synctest 相关标志
- 另有一个 `sema` 字段用于阻塞和唤醒等待者

也就是说，`WaitGroup` 的本质不是锁，而是：

> **原子计数 + 信号量唤醒**

所以它能做的是：

- `Add(delta)` 改计数
- `Done()` 等价于 `Add(-1)`
- `Wait()` 在计数不为 `0` 时睡眠，计数归零时被唤醒

### 3.7 `Mutex` 的正常模式和饥饿模式

这是很经典的源码题。当前 Go 的 `Mutex` 实现明确写了：

> `Mutex` 有两种模式：**normal mode** 和 **starvation mode**。

#### 正常模式

在正常模式下，等待者按 FIFO 排队，但**被唤醒的 waiter 并不会直接拥有锁**，它还要和“新来的 goroutine”竞争。

新来的 goroutine 已经在 CPU 上运行，所以经常更有优势，能更快抢到锁。这样做的好处是吞吐量更高，因为运行中的 goroutine 不用刚唤醒又重新调度。

#### 饥饿模式

如果某个 waiter 等得太久，`Mutex` 会切到饥饿模式。当前实现的阈值是 **等待超过约 `1ms`**。

在饥饿模式下，锁的所有权会**直接从解锁者移交给队头等待者**，新来的 goroutine 不再去和老等待者抢锁。

这样吞吐量可能差一点，但能避免个别 goroutine 长时间拿不到锁。

#### 为什么要两种模式切换

源码注释给出的动机非常明确：

- 正常模式性能更好，但在高竞争下可能导致尾部 goroutine 一直输给新来的 goroutine，从而“饿死”
- 饥饿模式更公平，但效率较低，因为锁会直接 handoff 给等待者

#### 什么时候从饥饿模式退回正常模式

当被唤醒的 waiter 发现自己已经是最后一个等待者，或者它等待时间其实没那么久了，mutex 会切回正常模式。

源码注释的总结就是：正常模式明显更高效，因此 `Mutex` 会在条件允许时尽快退出 starvation mode。

这一段可以压成一句话：

> `Mutex` 默认追求吞吐，用正常模式让“新来的”和“被唤醒的”等待者一起竞争；如果某个等待者饿太久，就切到饥饿模式，直接把锁交给等待队列前面的 goroutine。

### 3.8 `RWMutex` 的底层思路

`RWMutex` 内部不是“很多把锁”，而是组合了一个普通 `Mutex` 和若干计数/信号量字段来协调读者和写者。

对外暴露的关键语义是：

- 可有任意多个 reader 或 1 个 writer
- 若 writer 已经在等或持有锁，新的 reader 会被挡住
- 这样保证 writer 最终能获得锁

所以它的本质更像：

> 读者计数 + 写者闸门 + 唤醒协调

而不是“读操作完全无成本”。这也是为什么在写并不少时，`RWMutex` 不一定比 `Mutex` 更快。

### 3.9 三者怎么选

最实用的经验是：

- **`Mutex`**：默认首选，保护共享状态最稳
- **`RWMutex`**：只有在读明显多、且读临界区有一定成本时才考虑
- **`WaitGroup`**：只负责等待任务完成，不负责保护共享数据

很常见的组合就是：

- 用 `Mutex/RWMutex` 保护共享数据
- 用 `WaitGroup` 等待 goroutine 退出

### 3.10 面试速答版

- `Mutex` 适合保护共享可变状态，是默认首选的互斥原语
- `RWMutex` 适合读多写少场景，允许多个 reader 并发，但 writer 独占
- 一旦 writer 在等，新的 reader 会被阻塞，以保证写者最终拿到锁
- `WaitGroup` 不是锁，而是等待一组任务完成的计数同步器
- `WaitGroup` 的本质可以理解为“原子计数 + 信号量唤醒”
- `Mutex` 当前实现有 normal mode 和 starvation mode 两种
- 正常模式偏吞吐量，饥饿模式偏公平性
- 一般先用 `Mutex`，只有读明显远多于写时再考虑 `RWMutex`

### 3.11 参考资料

- [sync 包文档](https://pkg.go.dev/sync)
- [Go Wiki: Use a sync.Mutex or a channel?](https://go.dev/wiki/MutexOrChannel)
- [RWMutex 源码](https://go.dev/src/sync/rwmutex.go)
- [WaitGroup 源码](https://go.dev/src/sync/waitgroup.go)
- [internal/sync/mutex.go](https://go.dev/src/internal/sync/mutex.go)

## 4. 并发模型设计：EventLoop、单消费者串行队列、工具调用链

> [!note]
> 这一块更偏架构与工程设计，不是死记源码。可以先把它理解成：用 goroutine 提供并发执行单元，用 channel 提供有边界的消息流和同步点，再用 context / queue / state machine 把系统收束成稳定的执行模型。

### 4.1 EventLoop 模型：核心思想是什么

EventLoop 的本质不是“无限 `for-select` 很高级”，而是：

> **把复杂状态收敛到一个 goroutine 内串行处理，外部世界通过 channel 把事件投递进来。**

这样做的最大价值是：

- 避免很多共享状态加锁
- 让状态变更有严格顺序
- 更容易做超时、取消、背压、优雅退出

你可以先把它想成一个“单线程状态机”：

```go
for {
    select {
    case ev := <-inputCh:
        handle(ev)
    case cmd := <-controlCh:
        handleControl(cmd)
    case <-ctx.Done():
        return
    }
}
```

这里真正关键的不是 `select`，而是：

- **状态只在 loop 所在 goroutine 内修改**
- 外部协程不直接碰状态，只发消息

这会让系统稳定很多。

#### EventLoop 适合什么场景

很适合这些场景：

- 连接管理
- 会话状态机
- actor 风格对象
- 单实例任务调度器
- LLM 流式输出聚合器
- 工具调用过程编排器

凡是“**有状态 + 顺序敏感 + 并发输入很多**”的地方，EventLoop 都很合适。

#### EventLoop 的一个标准结构

建议脑子里固定这个骨架：

```go
type Event struct {
    Type string
    Data any
}

type Loop struct {
    ctx      context.Context
    cancel   context.CancelFunc
    inbox    chan Event
    control  chan Event
    done     chan struct{}

    // 仅 loop goroutine 内访问
    state MyState
}

func (l *Loop) Run() {
    defer close(l.done)

    for {
        select {
        case ev := <-l.inbox:
            l.handleEvent(ev)

        case cmd := <-l.control:
            l.handleControl(cmd)

        case <-l.ctx.Done():
            l.cleanup()
            return
        }
    }
}
```

这里有几个要点：

- `inbox`：业务事件
- `control`：控制命令，比如 `stop` / `flush` / `reload`
- `ctx.Done()`：统一退出
- `state`：只能在 `Run()` 这条 goroutine 里读写

#### EventLoop 为什么比“到处起 goroutine + 到处加锁”更稳

因为它把问题从：

- 多个 goroutine 同时改状态
- 到处竞争锁
- 顺序难推理

变成：

- 多个 goroutine 可以并发产生事件
- 但**只有一个 goroutine 改状态**
- 所有状态变化都有明确顺序

这就是典型的“**并发输入，串行落地**”。

### 4.2 单消费者串行队列：为什么它特别常用

这个模型其实可以看成 EventLoop 的一个特例。

核心思想是：

> 多个生产者并发写入 channel，一个消费者 goroutine 按顺序取出并串行处理。

结构很简单：

```go
jobs := make(chan Job, 1024)

go func() {
    for job := range jobs {
        process(job)
    }
}()
```

#### 这个模型适合什么问题

特别适合：

- 写数据库 / 写文件 / 写日志
- 顺序敏感的状态更新
- 去抖 / 合并更新
- 工具调用结果统一归档
- 会话消息顺序处理
- 限制下游服务并发压力

它的核心价值是：

> **把“很多人同时做”改成“很多人投递，一个人稳定做”。**

#### 为什么单消费者往往更稳定

因为很多系统真正不稳定的原因，不是“处理慢”，而是：

- 多线程同时写同一个对象
- 顺序乱
- 重复执行
- 重入
- 锁粒度不清晰
- 下游被瞬时打爆

单消费者模型天然避免其中一大半问题。

#### 这个模型的关键设计点

##### 队列必须有边界

不要轻易用无限制积压思维。要明确：

- 队列容量多大
- 满了怎么办
- 是阻塞生产者、丢弃、降级、还是转储

例如：

```go
select {
case jobs <- job:
    return nil
default:
    return ErrQueueFull
}
```

这比无脑阻塞更可控。

##### 处理必须可取消

消费者里最好始终带 `ctx`：

```go
for {
    select {
    case job := <-jobs:
        process(job)
    case <-ctx.Done():
        return
    }
}
```

##### 失败要分级

不要所有错误都 `panic` 或 `retry forever`。建议区分：

- 可重试错误
- 不可重试错误
- 需要人工介入错误

#### 单消费者的一个常见增强版：批处理

如果下游适合批量写入，可以做“聚合后批量提交”：

```go
var batch []Job
ticker := time.NewTicker(100 * time.Millisecond)
defer ticker.Stop()

for {
    select {
    case job := <-jobs:
        batch = append(batch, job)
        if len(batch) >= maxBatch {
            flush(batch)
            batch = batch[:0]
        }

    case <-ticker.C:
        if len(batch) > 0 {
            flush(batch)
            batch = batch[:0]
        }

    case <-ctx.Done():
        if len(batch) > 0 {
            flush(batch)
        }
        return
    }
}
```

这个模式在日志、指标、消息发送、工具结果落库里特别常见。

### 4.3 高稳定的工具自主调用链：怎么设计

这里说的“工具自主调用链”，可以理解成 LLM / agent 场景里这种流程：

1. 用户请求进入
2. 模型决定是否调用工具
3. 调一个或多个工具
4. 汇总工具结果
5. 继续推理 / 输出
6. 支持取消、超时、重试、审计

这个场景最怕：

- 调用链失控
- 并发过度
- 工具互相阻塞
- 重试风暴
- 流式输出和工具执行抢状态
- 用户取消后后台还在跑

所以这里特别适合“**EventLoop + 有界队列 + context**”。

#### 最稳的总原则：把编排做成状态机

不要让模型输出一条工具指令，你就临时起一个 goroutine 到处飞。

更稳的方式是把整个调用链抽象成状态机：

- `Init`
- `Planning`
- `CallingTool`
- `WaitingToolResult`
- `Synthesizing`
- `Streaming`
- `Done`
- `Failed`

然后由一个 loop 串行推进状态。

这样每一步都可观察、可审计、可恢复。

#### 推荐架构：控制面串行，执行面受限并发

这个模式特别重要：

> **控制面（状态推进）单线程串行**
>
> **执行面（工具调用）允许有限并发**

也就是说：

- 哪一步该调哪个工具，由一个 EventLoop 决定
- 工具真正执行，可以放到 worker goroutine
- 但结果必须回到 loop，由 loop 统一处理

结构像这样：

```go
type ToolRequest struct {
    CallID   string
    ToolName string
    Args     any
}

type ToolResult struct {
    CallID string
    Output any
    Err    error
}

toolReqCh := make(chan ToolRequest, 64)
toolResCh := make(chan ToolResult, 64)
```

Loop 负责：

- 发请求到 `toolReqCh`
- 收 `toolResCh`
- 更新状态
- 决定下一步

Worker 负责：

- 接工具请求
- 执行
- 把结果发回 `toolResCh`

这样好处是：

- 状态不乱
- 工具执行可并发
- 编排逻辑仍然单线可推理

#### 为什么工具调用链要“有界并发”

因为 agent 场景很容易失控：

- 模型可能连续规划多个工具
- 某些工具很慢
- 某些工具会级联调用外部 API
- 重试叠加后会形成雪崩

所以一定要有并发限制，比如 semaphore：

```go
sem := make(chan struct{}, 8)

go func(req ToolRequest) {
    sem <- struct{}{}
    defer func() { <-sem }()

    res := callTool(req)
    toolResCh <- res
}(req)
```

这能防止某一次请求把整个系统拖死。

#### 必须有统一的 `context`

所有东西都应该挂在同一个请求 `ctx` 下：

- 模型流式输出
- 工具调用
- 检索
- 审计
- 计费
- 回调

这样用户取消、超时、风控中断时，整条链都能一起停。

工具执行必须支持：

```go
select {
case <-ctx.Done():
    return ctx.Err()
default:
}
```

或者直接把 `ctx` 透传给 HTTP / RPC / DB client。

#### 工具调用结果不能直接改主状态

这是一个很关键的稳定性原则。

错误方式是：

- 每个工具 goroutine 执行完后自己去改共享状态

这会很快变成竞态和锁地狱。

更稳的方式是：

- 工具 goroutine **只返回结果**
- 主状态只能由 EventLoop 统一更新

也就是：

> worker 不拥有主状态，worker 只产出事件。

这和 actor / event-sourcing 的味道很像。

#### 工具调用链需要哪些保护机制

##### 调用深度限制

防止模型无限自调用、循环调用。

比如：

- 最多 `8` 步
- 最多 `3` 次工具轮次
- 最多 `20` 秒链路生命周期

##### 幂等 ID

每次工具调用要有 `CallID`，这样：

- 结果能对上
- 重试不会搞混
- 日志 / tracing 可追踪

##### 超时隔离

每个工具自己的 timeout，不能全靠总超时：

- 总请求 `30s`
- 搜索工具 `5s`
- 数据库工具 `2s`
- 网页抓取 `8s`

##### 错误分级

- 软错误：模型可继续推理
- 硬错误：必须终止链路
- 可降级错误：跳过该工具继续

##### 背压

如果工具结果消费不过来，系统不能无限堆积。结果通道、任务通道都要有容量控制和溢出策略。

### 4.4 一个推荐的稳定模型

下面是一个很实用的工程脑图。

#### 输入侧

- 用户请求
- 上游消息
- 网络回包
- 工具结果

都统一转成事件，投进 EventLoop。

#### 控制侧

一个 goroutine 持有会话状态，做：

- 状态推进
- 决策下一步
- 写审计日志
- 发工具请求
- 处理取消 / 超时 / stop

#### 执行侧

一个受限并发的 worker 池做：

- 工具执行
- 外部网络请求
- IO 型任务

#### 收尾侧

统一做：

- flush 未发完流
- 取消未完成工具
- wait worker 退出
- 记录 final status

这是非常典型、稳定性也很高的一套设计。

### 4.5 常见反模式

这些很容易把系统做炸：

#### 共享状态到处写

多个 goroutine 同时改 session / memory / plan。

#### 每个工具结果都直接回调改状态

最后只能靠大锁兜底，逻辑会越来越乱。

#### 无界 channel

队列积压无上限，内存被慢慢吃光。

#### 请求取消后后台仍继续跑

最常见于流式输出、HTTP client、数据库查询没接 `ctx`。

#### 用 `RWMutex` 过度优化

很多状态机场景其实根本不需要读写锁，单 goroutine loop 更清晰。

#### 工具失败后无限重试

必须有 retry budget 和 backoff。

### 4.6 面试速答版

- 在 Go 里构建高稳定并发模型，一个核心思路是：goroutine 负责并发执行，channel 负责事件流和同步边界，复杂状态收敛到单 goroutine 的 EventLoop 中串行推进
- EventLoop 适合“有状态 + 顺序敏感 + 并发输入很多”的场景，本质是并发输入、串行落地
- 单消费者串行队列是 EventLoop 的常见特例：很多生产者投递，一个消费者顺序处理
- 工程上要特别注意队列有界、失败分级、批处理、背压和可取消性
- 工具自主调用链推荐“控制面串行，执行面受限并发”
- 工具 worker 只产出结果事件，不直接改主状态
- 所有链路都应挂在统一 `ctx` 下，支持超时、取消和优雅退出
- 稳定系统最怕的反模式是：共享状态到处写、无界队列、取消后后台还继续跑、工具无限重试

## 5. defer

### 5.1 用途

`defer` 用来做函数结束前的收尾工作，最常见的是：

- 释放资源，比如关闭文件 `Close()`
- 解锁，比如 `Unlock()`
- 关闭连接、关闭响应体
- 做日志、耗时统计、异常恢复

你可以概括成一句：

> `defer` 主要用于保证函数退出前，一定执行某些清理或收尾逻辑。

### 5.2 执行顺序

多个 `defer` 的执行顺序是 **后进先出**，也就是 **LIFO**。  
谁最后写，谁最先执行。

> `defer` 常用于资源释放和收尾逻辑，多个 defer 的执行顺序是后进先出。


