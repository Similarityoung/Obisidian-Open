---
title: Go 语言八股问答
type: notes
slug: interview-go-qa
summary: "以问题和回答的形式整理 Go 语言面试知识。"
date: 2026-10-18
draft: false
categories:
  - Go
tags:
  - interview
---

# Go 语言八股问答

![Google Chrome 2026-10-18 16.11.59.png](https://img.simi.host/20261018163645836.png)

## 1. 讲一下协程、线程、进程

### 回答

进程是操作系统分配资源的基本单位。线程是进程内被 CPU 调度执行的基本单位，协程是用户态或语言运行时管理的轻量执行单元。

进程有独立地址空间和系统资源；同一进程内的线程共享地址空间、文件句柄等资源，同时各自拥有栈和寄存器上下文；Go 里的 goroutine 由 Go runtime 调度，并多路复用到多个 OS 线程上执行。

### 要点

- 进程：资源容器，拥有虚拟地址空间、打开的文件、权限上下文等资源。
- 线程：调度实体，同一进程内线程共享进程资源，各自有栈、寄存器和线程局部状态。
- 协程：用户态/运行时层面的任务抽象，切换更轻，适合组织大量并发任务。
- Go goroutine：初始栈小，由 runtime 调度，阻塞 I/O 时 runtime 会让其他 goroutine 继续运行。
- 成本关系：进程切换涉及地址空间等资源切换；线程切换依赖内核调度；goroutine 调度成本更低。

![image.png](https://img.simi.host/20261019223447124.png)

## 2. GMP 中为什么需要 P

### 回答

> P 的本质，是把“调度能力”从 OS Thread M 身上拆出来。

如果只有 G 和 M，大量 M 从一个全局 Goroutine 队列取任务，会造成全局队列严重的锁竞争；如果把任务队列直接绑定到每个 M 上，那么当某个 OS Thread 因系统调用等原因阻塞时，它对应的调度资源和待执行 Goroutine 也会受到影响，本质上是 G 的调度状态和 M 耦合得太深。G 太依赖 M。

因此 Go 引入 P，把执行 Goroutine 所需的调度资源从 M 中抽离出来。每个 P 维护本地运行队列，减少全局锁竞争；M 需要绑定 P 才能执行 Go 代码，当 M 阻塞时，P 可以解绑并交给其他 M 继续运行；同时 P 的数量由 GOMAXPROCS 控制，用来限制 Go 代码的并行度。

![image.png](https://img.simi.host/20261019144436974.png)

## 3. Go map 底层怎么实现？

### 回答

#### 使用

Go 的 `map` 是内置哈希表，key 必须是可比较类型，查询、插入、删除平均复杂度接近 O(1)。`map` 是引用类型，`make` 会初始化底层哈希结构；具体底层结构属于 runtime 实现细节，新版本 Go 已经从老的 bucket/overflow 设计演进到 SwissTable 风格实现。并发方面，多个 goroutine 同时读写同一个普通 `map` 需要加锁或用其他同步方式，典型做法是 `map + sync.RWMutex`；读多写少、key 稳定的缓存场景可以考虑 `sync.Map`。

#### 细节

Go 1.24 以后，内置 map 改成了基于 Swiss Table 的实现。底层由一个 directory 管理一个或多个 table，每个 table 又由多个 group 组成，每个 group 有 8 个 key/value slot 和一组 control bytes。查找时通过 hash 高位定位 table 和 probing 位置，再利用 hash 的低 7 位快速筛选 group 中的候选 slot。

map 本身不是并发安全的，并发写、读写可能导致 runtime fatal，一般需要通过 Mutex/RWMutex 或 sync.Map 来保证并发安全。

#### 扩容

扩容时不会简单对整个 map 一次性翻倍，而是针对单个 table 进行 grow；当 table 达到一定规模时会 split 成多个 table，通过 directory 和 hash 前缀选择对应 table，从而把扩容成本限制在局部。

#### 跟 sync.Map 的区别

普通 `map` 是 Go 内置哈希表，类型安全、性能直接，适合大多数业务场景；并发读写时需要自己用 `Mutex`、`RWMutex` 或 channel 做同步。`sync.Map` 是标准库提供的并发安全 map，所有操作方法可以被多个 goroutine 同时调用，适合读多写少、key 写入后反复读取，或者多个 goroutine 操作互不重叠 key 的场景。它的 API 基于 `any`，类型约束和复合业务不变量要靠调用方维护。

![image.png](https://img.simi.host/20261019224619470.png)

## 4. 讲一下三色标记法，什么是混合写屏障

### 答案

#### 三色标记

三色标记是 GC 在标记阶段用来描述对象扫描进度的抽象：白色表示还没确认可达，灰色表示已经发现但它引用的对象还没扫描完，黑色表示对象本身和它引用的对象都已经扫描过。标记从根对象开始，先把根能到达的对象变灰，再不断取灰色对象扫描它的指针，把新发现对象变灰，当前对象扫描完变黑。最后标记结束时仍是白色的对象就是不可达对象，后续 sweep 阶段会回收它们。

#### 混合写屏障

混合写屏障是 Go 并发 GC 在指针写入时插入的一段屏障逻辑，用来防止应用线程在 GC 标记期间把可达对象“藏起来”。它结合了 Yuasa 删除屏障和 Dijkstra 插入屏障：覆盖一个指针前，先把旧指针指向的对象标灰；如果当前 goroutine 的栈还是灰色，再把新写入指针指向的对象标灰；然后完成真正的指针写入。这样 GC 可以和用户程序并发运行，同时减少重新扫描栈带来的 STW 时间。


