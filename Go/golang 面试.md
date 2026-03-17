---
title: golang 面试
aliases:
  - Go 面试
  - Golang 面试题
tags:
  - go
  - 面试
  - slice
  - map
  - sync
  - channel
  - context
categories:
  - Go
date: 2026-03-16
draft: false
---

# golang 面试

## 1. 切片的本质：对底层数组连续区间的描述

> [!note]
> slice 不是数组本身，而是对底层数组某一段连续区间的描述符。面试里如果要一句话概括，可以直接说：`slice = 指针 + len + cap`。

切片（slice）不是数组本身，而是对底层数组某一段连续区间的描述符。Go 语言规范明确指出：slice 是 underlying array 的连续片段（contiguous segment）的 descriptor。

一个切片一旦初始化，就总是关联着某个底层数组，并与该数组、以及同一数组上的其他切片共享存储。

从运行时和官方资料的角度，可以把切片理解为由三部分信息组成：

- 指向底层数组某个元素的指针
- 当前长度 `len`
- 当前容量 `cap`

可以抽象理解为：

```go
type slice struct {
    array *T
    len   int
    cap   int
}
```

这里的 `array` 指向的是当前切片可见区间的起始元素，不一定是整个底层数组的第 `0` 个元素。

### 1.1 `len` 与 `cap` 的含义

#### 长度 `len`

`len(s)` 表示切片当前可访问的元素个数。合法下标范围是：

```go
0 <= i < len(s)
```

如果运行时访问越界，会触发 `panic`。规范也说明了，slice 的元素索引范围是 `0` 到 `len(s)-1`。

#### 容量 `cap`

`cap(s)` 表示：在复用当前底层数组的前提下，这个切片最多还能扩展到多长。

规范中的定义更精确：容量等于“当前切片长度 + 底层数组中位于该切片之后的那部分长度”。因此总有：

```go
len(s) <= cap(s)
```

对于 slice，`cap` 可以理解为重新切片（reslice）时所能达到的最大长度上限。

例如：

```go
a := [5]int{1, 2, 3, 4, 5}
s := a[1:4]
```

此时：

```go
len(s) == 3
cap(s) == 4
```

因为 `s` 从 `a[1]` 开始，到数组末尾一共有 `4` 个元素可覆盖。

### 1.2 `make` 创建切片

使用 `make` 创建切片时，会分配一个新的底层数组，并返回引用该数组的切片：

```go
s := make([]int, 3, 5)
```

这表示：

- 长度为 `3`
- 容量为 `5`
- 底层数组长度至少能容纳 `5` 个元素

如果省略容量参数：

```go
s := make([]int, 3)
```

则默认 `cap(s) == len(s)`。

### 1.3 切片表达式与共享底层数组

#### 普通切片表达式

普通切片表达式：

```go
a[low:high]
```

得到的新切片：

- 长度为 `high - low`
- 若结果是 slice，则与原操作数共享底层数组

例如：

```go
b := []byte{'g', 'o', 'l', 'a', 'n', 'g'}
x := b[1:4] // {'o', 'l', 'a'}
```

`x` 和 `b` 共享同一块底层存储，因此修改 `x` 的元素，可能影响 `b`。

#### 容量受 `cap` 约束，而不是 `len`

对于 slice，再切片时上界不是只能到 `len(s)`，而是可以到 `cap(s)`：

```go
s2 := s[:cap(s)]
```

只要不超过 `cap(s)`，就是合法的；超过则运行时 `panic`。这是 Go 切片很容易混淆但非常重要的规则。

#### 三下标切片：显式限制容量

Go 还支持 full slice expression：

```go
a[low:high:max]
```

它和 `a[low:high]` 得到相同的元素和长度，但会把结果切片的容量设为：

```go
cap == max - low
```

这在需要限制后续 `append` 继续复用原底层数组时很有用。

例如：

```go
sub := s[i:j:j]
```

此时 `len(sub) == j - i`，`cap(sub) == j - i`。这样后续如果对 `sub` 执行 `append`，就更容易触发重新分配，而不是继续写到原底层数组后面。

### 1.4 `append` 的语义

`append` 是向切片尾部追加元素的内建函数：

```go
s = append(s, x)
s = append(s, y1, y2, y3)
s = append(s, otherSlice...)
```

官方语义可以概括为：

- 如果容量足够，目标切片会被重新切片（reslice）以容纳新元素
- 如果容量不足，则会分配新的底层数组
- `append` 返回更新后的切片，因此结果必须接住

也就是说，判断核心不是“追加一个元素”，而是：

```go
newLen := len(s) + 追加元素个数
```

若 `newLen <= cap(s)`，通常复用原底层数组；若 `newLen > cap(s)`，就会触发扩容，分配新数组并复制旧数据。

### 1.5 Go 1.18+ 的切片扩容规则

这里只讨论 Go 1.18 及以后，不再混入旧版本“`1024` 分界线”的规则。

当前 Go 运行时在 `nextslicecap(newLen, oldCap)` 中计算新容量，核心规则如下。

#### 若需求特别大，直接至少扩到 `newLen`

如果追加后的目标长度已经大于旧容量的两倍：

```go
if newLen > 2*oldCap {
    newCap = newLen
}
```

运行时会直接把新容量至少设到 `newLen`，避免做多次渐进增长。

#### 小切片：容量小于 `256` 时翻倍

如果 `oldCap < 256`，则新容量直接按 `2` 倍增长：

```go
newCap = 2 * oldCap
```

#### 大切片：容量达到 `256` 后平滑增长

如果 `oldCap >= 256`，运行时使用下面的平滑增长公式：

```go
newcap += (newcap + 3*256) >> 2
```

也就是让增长因子随着容量增大，逐步从接近 `2.0` 过渡到接近 `1.25`，而不是在某个点突然切换。

#### 这只是“目标容量”，实际分配可能更大

运行时后续还会结合元素大小和内存分配器的分配粒度做向上取整，因此最终实际分配的容量可能略大于公式直接算出来的值。

所以实测 `cap` 有时看起来“不完全按公式来”，这属于正常现象。这个差异来自运行时分配阶段，而不是 `append` 规则失效。

### 1.6 扩容后的影响：切片可能换底层数组

一旦 `append` 触发扩容，返回的新切片可能已经引用了新的底层数组。这意味着：

- 旧切片和新切片未必再共享存储
- 所以 `append` 的结果必须重新赋值

典型写法：

```go
s = append(s, v)
```

而不是：

```go
append(s, v) // 结果被丢弃
```

因为 `append` 返回的是 updated slice，必须保存返回值。

### 1.7 小切片引用大数组：这不是严格意义上的“内存泄漏”

当你从一个很大的切片里截出一小段并长期保存时，小切片依然可能引用那块大的底层数组：

```go
func getTail() []byte {
    large := load100MBData()
    return large[len(large)-10:]
}
```

这段返回值虽然只有 `10` 个字节可见，但它仍共享原来的底层数组。只要这个小切片还活着，GC 就会认为底层数组仍被引用，因此那块大内存不能被回收。

更准确的说法不是“内存泄漏（memory leak）”，而是：

- 内存滞留
- 内存驻留
- 因仍有引用而无法回收的大对象保活

也就是说，GC 并没有失效；它只是遵循可达性规则，发现这块数组仍然可达。

### 1.8 如何避免大数组被小切片长期拖住

如果只想保留一小段数据，并且希望原大数组尽快释放，就要主动复制出一份独立数据。

#### 用 `copy`

```go
tail := large[len(large)-10:]
small := make([]byte, len(tail))
copy(small, tail)
return small
```

`copy(dst, src)` 会把源切片元素复制到目标切片，返回实际复制的元素数。

#### 用 `append` 复制

```go
small := append([]byte(nil), large[len(large)-10:]...)
```

这也是常见写法：通过向一个空切片追加，得到新的底层数组。

### 1.9 Go 1.18+ 实战注意点

#### 不要依赖“`append` 后一定原地修改”

是否复用原底层数组，取决于容量是否足够。容量足够时可能原地写；容量不足时就会换新数组。代码逻辑不能偷做这个假设。

#### 想减少扩容次数，优先预分配

已知大致规模时，优先用：

```go
make([]T, 0, n)
```

或者在 Go 1.21+ 使用 `slices.Grow` 预留空间。`slices.Grow` 可以保证至少再 `append n` 个元素而不再分配。

#### 想隔离后续 `append` 对原数组的影响，可用三下标切片

```go
sub := s[i:j:j]
```

这样可以把 `cap(sub)` 限制为 `len(sub)`，避免后续 `append` 无意间写到原底层数组的后半段。

#### 长期保存小片段时，优先复制

如果原切片很大，而你只需要其中很小的一部分长期存活，应该复制而不是直接返回子切片，否则容易出现大对象长期驻留。

### 1.10 面试速答版

- slice 不是数组，是对底层数组连续区间的描述符
- 本质上可以理解为 `pointer + len + cap`
- 多个切片可能共享同一个底层数组
- `append` 是否原地写，取决于容量是否足够
- 触发扩容后，切片可能更换底层数组，所以必须接住返回值
- 小切片长期引用大数组，会造成大对象持续存活，必要时要主动复制

## 2. map（仅记录 Go 1.24+）

> [!warning]
> 这一节只记录 Go 1.24 及以后版本的当前口径。`hmap`、`bmap`、overflow bucket、same-size grow，以及 `sync.Map` 的 `read/dirty` 双表，都属于旧版本实现细节，不再作为当前标准答案。

### 2.1 先记语言层结论

从语言层面看，`map` 是“无序的键值集合”，规范保证的是语义，不保证具体底层结构。也就是说，面试里如果聊运行时实现，必须主动说明版本。

几个稳定结论：

- `map` 的 key 类型必须是可比较（comparable）的类型
- 未初始化的 `map` 是 `nil`
- `nil map` 可以读、可以 `range`、可以 `delete`，但不能写
- `make(map[K]V, hint)` 里的 `hint` 只是容量提示，不是像 slice 那样可见的 `cap`
- `range map` 的迭代顺序未指定，不能依赖顺序

例如：

```go
var m map[string]int

fmt.Println(m["k"]) // 0
fmt.Println(len(m)) // 0

for k, v := range m {
    fmt.Println(k, v)
}

m["k"] = 1 // panic: assignment to entry in nil map
```

### 2.2 Go 1.24+ 的内建 `map`：Swiss Table

从 Go 1.24 开始，内建 `map` 已经切换为基于 **Swiss Table** 的新实现。它的核心定位是：

- 本质上仍然是哈希表
- 采用 **open addressing（开放寻址）**
- 冲突不再通过 overflow bucket 链解决，而是通过 **probe sequence** 继续探测

当前运行时源码中，几个核心概念可以这样记：

- **slot**：一个键值对的存储位置
- **group**：一组 `8` 个 slot，再加一个控制字
- **control word**：`8` 字节元数据；每个字节对应一个 slot，记录空位、删除标记，或该 slot 对应 key 的部分哈希
- **H1 / H2**：哈希值会拆成两段；高位（57 位）用于定位初始 group，低 `7` 位用于组内快速筛选候选槽位

面试里可以这样描述查找过程：

1. 先计算 `hash(key)`。
2. 用高位哈希定位起始 group。
3. 通过 control word 并行检查这一组 `8` 个槽位里，哪些槽位的 `H2` 可能匹配。
4. 对候选槽位再做真正的 key 比较。
5. 如果当前 group 没命中，就沿着 probe sequence 去下一个 group。

一句话总结：

> Go 1.24+ 的 `map` 已经不是“桶 + overflow bucket”的模型，而是 Swiss Table 风格的开放寻址哈希表。

### 2.3 Go 1.24+ 的冲突、删除与增长

#### 冲突处理

当前版本里，哈希冲突的解决方式是：

> **开放寻址 + 探测序列**

运行时源码里明确写的是在 groups 上做 probing，并使用 **quadratic probing** 去走后续 group，而不是旧版本那种“主桶满了挂 overflow bucket”。

#### 删除

Swiss Table 的查找在遇到 empty slot 时可以停止，因此删除不能总是简单地把槽位直接标空。

当前实现里：

- 如果直接标空不会破坏 probe 链，可以设为空
- 否则会打上 **tombstone（墓碑标记）**
- tombstone 的彻底清理主要发生在 grow 期间

#### 增长

Go 1.24+ 的增长方式也和旧版不一样。

当前运行时源码说明：

- 单个 table 的探测序列依赖 group 数量，所以 table 一旦扩表，必须整体重排
- 为了支持增量式增长，顶层 map 会把数据分散到多个 table
- 顶层通过 **directory + extendible hashing** 选择 key 属于哪张 table
- map 初始只有一张 table
- 在单表还没到上限前，增长通常表现为 table 容量翻倍
- 超过单表上限后，会把 table **split** 成两张 table，directory 也可能随之增大

这意味着：

> Go 1.24+ 仍然支持渐进式增长，但实现手段不再是旧版 `oldbuckets + nevacuate` 那套搬桶模型，而是基于多 table 和 directory 的增长/分裂机制。

#### 小 map 优化

当前源码里还有一个很实用的点：如果 map 始终只有很少的元素，运行时会走 **small map optimization**，直接把数据放进单个 group 里，而不必一开始就建完整 directory。

### 2.4 为什么普通 `map` 仍然不是并发安全的

虽然底层实现已经变成 Swiss Table，但这个结论没有变：

> **普通 `map` 依然不能在没有同步的前提下并发读写。**

当前运行时实现里仍然有写标记检查。源码中如果发现并发读写或并发写，会直接触发 fatal，例如：

- `concurrent map read and map write`
- `concurrent map writes`

因此，正确结论仍然是：

- 多 goroutine 并发访问普通 `map` 时，需要自己加 `Mutex` 或 `RWMutex`
- 不能因为某次运行没报错，就认为代码是安全的

### 2.5 `sync.Map`：当前版本该怎么理解

#### 先记官方定位

当前 `sync.Map` 的官方定位很明确：

- 它是并发安全的 `map[any]any`
- `Load`、`Store`、`Delete` 等操作是摊还常数时间
- 零值可直接使用
- 首次使用后不能再拷贝
- 官方仍然强调：大多数业务代码优先用 **普通 `map` + 锁**

另外，内存模型层面还有一个很重要的点：

> `sync.Map` 保证某次写操作，会 **synchronizes before** 那些观察到这次写结果的读操作。

这意味着它不只是“没有 data race”，而是标准库明确给了并发可见性语义。

#### 底层结构：不是分段锁，而是并发 hash-trie

当前源码里：

```go
type Map struct {
    _ noCopy
    m isync.HashTrieMap[any, any]
}
```

所以当前 `sync.Map` 的核心实现是 `internal/sync.HashTrieMap`，而不是：

- 不是 Java 风格的“分段锁”
- 不是 Go 旧版本里常见的 `read/dirty` 双表

`HashTrieMap` 可以这样理解：

- 整体是一棵基于哈希值逐层分流的前缀树
- 根节点是原子指针指向的内部节点
- 内部节点叫 `indirect node`
- 叶子节点叫 `entry`

源码里每个内部节点有：

- `16` 个子槽位
- 一个 `Mutex`
- 一个 `dead` 标记
- 一个父节点指针

对应源码常量是：

```go
nChildrenLog2 = 4
nChildren     = 16
```

也就是说，查找时每往下一层，大致会消费哈希值的 `4` 个 bit。

叶子节点 `entry` 里保存：

- `key`
- `value`
- 一个 `overflow` 指针

这个 `overflow` 不是旧版内建 `map` 的 overflow bucket，而是：

> 当两个 key 的完整哈希值都撞到一起时，叶子节点会挂一个小链表来处理极端哈希碰撞。

所以更准确的说法是：

> `sync.Map` 的主体结构是并发 hash-trie，极端完整哈希冲突时，叶子节点内部还会退化出一条小 overflow 链。

#### 读路径：大部分时间不加全局锁

`Load` 的核心路径可以这样理解：

1. 先算 key 的哈希。
2. 从根节点开始，按 `4 bit` 一层往下走。
3. 每一层通过原子读拿对应 child。
4. 如果遇到 `entry`，就检查 key 是否命中；若存在 overflow 链，再顺着链找。
5. 如果中途遇到空槽位，就说明 key 不存在。

这个过程的重要特征是：

- 没有全局大锁
- 主要依赖原子指针读
- 所以它很适合读多的场景

面试里可以把它概括成：

> 当前 `sync.Map` 的读路径基本是沿 hash-trie 做原子读遍历，所以读多场景下锁竞争会比较小。

#### 写路径：节点级加锁，不是完全无锁

`Store`、`Swap`、`LoadOrStore` 这类写操作并不是无锁的。

它的大致流程是：

1. 先像读一样找到目标 key 所在位置，或者找到候选插入点。
2. 给对应的 `indirect node` 加锁。
3. 加锁后再 double-check 一遍，确认刚才看到的结构还成立。
4. 如果位置还是有效，就执行插入、替换或扩展。
5. 如果结构已经被别的 goroutine 改了，就解锁重试。

所以当前 `sync.Map` 更准确的描述应该是：

> 读路径大量依赖原子读，写路径是节点级互斥。

#### 冲突和扩展是怎么做的

如果两个 key 的哈希在当前层选择了同一个 child，但后续 bit 不同，那么实现会继续往下补更多 `indirect node`，直到把两个 entry 分开。

源码里 `expand` 的注释写得很直白：当两个 entry 从当前位开始冲突时，会构造一个新的子树来容纳它们。

如果两个 key 的完整哈希值完全相同，那就没法继续往下拆了，这时会把旧 entry 挂到新 entry 的 `overflow` 链上。

因此可以这样背：

- 哈希前缀冲突：往下长树
- 完整哈希冲突：叶子挂链

#### 删除路径：删完还会向上修剪

`Delete`、`LoadAndDelete`、`CompareAndDelete` 删除 entry 之后，不只是简单把值删掉。

如果某个内部节点因此变空，当前实现还会：

- 继续往上检查父节点
- 把已经空掉的内部节点从树上剪掉
- 把被剪掉的节点标记为 `dead`

所以当前 `sync.Map` 会做一定的结构清理，而不是只增不减地一直长。

#### API 语义：这些点面试里很值钱

##### `LoadOrStore`

这是 `sync.Map` 最常见的工程用法之一：

```go
actual, loaded := m.LoadOrStore(key, value)
```

语义是：

- 如果 key 已存在，返回旧值，`loaded == true`
- 如果 key 不存在，则存入新值，`loaded == false`

这很适合做“并发下一次性初始化”或“缓存只构建一次”的场景。

##### `CompareAndSwap` / `CompareAndDelete`

这两个方法适合做条件更新，但有一个很容易丢分的细节：

- `old` 对应的值类型必须是 **comparable**
- 否则会 `panic`

##### `Range`

`Range` 的几个关键语义要单独记：

- 它不是一致性快照
- 同一个 key 在一次 `Range` 中不会被访问多次
- 但如果并发有写入或删除，某个 key 对应的 value 可能反映的是遍历期间任意时刻的值
- `Range` 不会阻塞这个 `Map` 的其他方法
- `f` 里面甚至可以继续调用这个 `Map` 的方法
- 即使 `f` 很快返回 `false`，`Range` 的代价也可能仍然是 `O(N)`

所以它适合做“尽力而为的遍历”，不适合做“强一致快照遍历”。

##### `Clear`

`Clear` 在当前版本可用，你可以把它理解成：

> 直接清空整张并发树，而不是逐个 key 删除。

#### 什么时候适合用，什么时候别硬用

官方明确推荐的甜点场景还是这两个：

- key 基本只写一次，但会被读很多次
- 多个 goroutine 操作的 key 集基本不重叠

如果是下面这些情况，通常更推荐 `map + Mutex/RWMutex`：

- 你想要明确的 `map[K]V` 类型安全
- 你需要同时维护 map 之外的其他状态不变量
- 你需要把多次读写包成一个临界区
- 你需要更容易推理的整体一致性

还有一个常见经验判断：

> 如果大量 goroutine 在反复竞争同一批热点 key，`sync.Map` 往往也不是最舒服的选择。

这条是根据官方推荐场景反推出来的工程判断，不是标准库文档里的原句。

#### 实战注意点

- `sync.Map` 的 key 和 value 都是 `any`，用起来通常需要类型断言
- 因为缺少泛型签名，很多项目会在外面包一层 typed wrapper
- 它解决的是“并发访问 map”的问题，不会自动帮你维护跨 key 的业务一致性
- 不要把 `Range` 当成数据库里的快照扫描
- 不要因为它是并发安全的，就默认它一定比 `map + RWMutex` 更快

#### 面试回答模板

如果面试官问“当前 Go 版本的 `sync.Map` 是什么”，可以直接答：

> 当前 `sync.Map` 是一个并发安全的 `map[any]any`，底层已经不是旧版的 `read/dirty` 双表，也不是分段锁，而是基于 `internal/sync.HashTrieMap` 的并发 hash-trie。读路径主要靠原子指针沿树查找，写路径会锁住目标内部节点再 double-check，所以它比较适合读多写少、或者不同 goroutine 操作不同 key 集的场景。`Range` 不是一致性快照，多数业务里仍然优先考虑普通 `map` 配合 `Mutex` 或 `RWMutex`。

### 2.6 面试速答版

- 语言层只保证 `map` 是无序键值集合，具体底层实现属于运行时细节
- Go 1.24+ 的内建 `map` 使用 Swiss Table
- 当前冲突处理方式是开放寻址 + probe sequence，不再是 overflow bucket
- 组内通过 control word 一次并行筛 `8` 个 slot，再做真实 key 比较
- 当前增长机制依赖 table grow / split 和 directory，不再是旧版 `oldbuckets` 迁移
- 普通 `map` 仍然不是并发安全的，并发访问要自己加锁
- 当前 `sync.Map` 基于 `HashTrieMap`，不是分段锁，也不是旧版 `read/dirty` 双表
- `sync.Map` 读路径以原子遍历为主，写路径是节点级加锁
- `Range` 不是一致性快照
- 多数业务场景仍然优先 `map + Mutex/RWMutex`

### 2.7 参考资料

- [Go 语言规范：Map types](https://go.dev/ref/spec)
- [Faster Go maps with Swiss Tables](https://go.dev/blog/swisstable)
- [Go 1.24+ runtime map 源码](https://go.dev/src/internal/runtime/maps/map.go)
- [sync.Map 源码](https://go.dev/src/sync/map.go)
- [HashTrieMap 源码](https://go.dev/src/internal/sync/hashtriemap.go)
- [sync 包文档](https://pkg.go.dev/sync)

## 3. channel（按当前 Go 运行时口径）

> [!note]
> 这一节重点记 `hchan`、缓冲区、等待队列、阻塞条件和 `close`/`panic` 语义。面试里如果要一句话概括，可以直接说：`channel = 带锁的同步结构 + 可选环形缓冲区 + sendq/recvq 等待队列`。

### 3.1 Channel 的底层结构：`hchan`

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

### 3.2 什么是环形队列

有缓冲 channel 里的数据不是随便放的，而是放在一个**环形缓冲区**里。

- `sendx` 指向下一次发送应该写到哪里
- `recvx` 指向下一次接收应该从哪里读
- 到了数组末尾会绕回开头，所以叫环形队列

你可以把它想成一个圆形传送带：

- 发送时把数据写到 `sendx`
- 接收时从 `recvx` 取数据
- 指针一路往前走，走到末尾就回到开头

这也是 channel 能高效做 FIFO 的原因。

### 3.3 `sendq` 和 `recvq` 是什么

如果当前这次发送或接收**不能立刻完成**，对应 goroutine 就不会原地空转，而是会被挂到等待队列里：

- `sendq`：发送方暂时发不出去时，挂在这里
- `recvq`：接收方暂时收不到时，挂在这里

这两个队列里挂的不是值本身，而是等待中的 goroutine 相关信息。

所以 channel 不只是“一个缓冲区”，它还是一个**同步点**。

### 3.4 无缓冲 channel 和有缓冲 channel 的区别

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

### 3.5 发送的几种情况

#### 情况 A：有等待中的接收者

如果 `recvq` 里已经有人在等接收，那么发送可以**直接把值交给那个接收者**，甚至不一定先经过缓冲区。

#### 情况 B：没有接收者，但缓冲区还有空位

如果是有缓冲 channel，且 `qcount < dataqsiz`，发送就把值写进环形队列，然后返回。

#### 情况 C：没有接收者，且缓冲区已满

这时发送不能立刻完成，发送 goroutine 会阻塞，并进入 `sendq` 等待。

### 3.6 接收的几种情况

#### 情况 A：有等待中的发送者

如果 `sendq` 里已经有发送者在等，那么接收可以直接从那个发送者拿到值。

#### 情况 B：缓冲区里有数据

如果 `qcount > 0`，接收就从环形队列当前位置读出一个元素，然后返回。

#### 情况 C：没有发送者，缓冲区也空

这时接收不能立刻完成，接收 goroutine 会阻塞，并进入 `recvq` 等待。

### 3.7 常见阻塞场景

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

### 3.8 `close` 之后会发生什么

Go 内建 `close` 的语义可以概括成：

- channel 关闭后，**已经发进去但还没被接收的数据**，仍然可以继续被接收
- 当这些数据都取完后，再继续接收，会**立刻返回元素类型的零值**
- 用 `v, ok := <-ch` 时，这时 `ok` 会变成 `false`

所以关闭 channel 不是“把里面的数据清空”，而是：

> 表示不会再有新值发送进来。

### 3.9 哪些操作会 panic

#### 向已关闭的 channel 发送

一定会 panic。

#### 重复关闭一个 channel

会 panic，`close` 只能成功一次。

#### 关闭 `nil channel`

会 panic。

### 3.10 哪些操作不会 panic，但行为容易搞错

#### 从已关闭的 channel 接收

**不会 panic**。

它会先把缓冲区剩余值读完；读完后继续接收会立刻返回零值。

#### 对 `nil channel` 收发

**不会 panic**，但会一直阻塞。

### 3.11 一个很重要的运行时不变量

当前运行时源码在 `chan.go` 里写了几个不变量，其中两个很值得记：

- 对于有缓冲 channel，`qcount > 0` 意味着 `recvq` 为空
- 对于有缓冲 channel，`qcount < dataqsiz` 意味着 `sendq` 为空

这背后的直觉是：

- 缓冲区里已经有数据时，接收通常可以直接从缓冲区拿，不需要排队等
- 缓冲区还没满时，发送通常可以直接写进去，也不需要排队等

### 3.12 面试速答版

- channel 的底层核心结构是 `hchan`
- `hchan` 里既有缓冲区信息，也有 `sendq` / `recvq` 两条等待队列
- 无缓冲 channel 必须发送接收直接配对
- 有缓冲 channel 只在“满了不能发”或“空了不能收”时阻塞
- 向 `nil channel` 收发会永久阻塞
- 向已关闭 channel 发送、重复关闭 channel、关闭 `nil channel` 都会 panic
- 从已关闭 channel 接收不会 panic；数据读完后会立刻返回零值，且 `ok == false`

### 3.13 参考资料

- [runtime/chan.go](https://go.dev/src/runtime/chan.go)
- [runtime/chan.go 文本版](https://go.dev/src/runtime/chan.go?m=text)
- [A Tour of Go: Channels](https://go.dev/tour/concurrency/2)
- [A Tour of Go: Range and Close](https://go.dev/tour/concurrency/4)
- [Go 语言规范](https://go.dev/ref/spec)
- [builtin 包源码](https://go.dev/src/builtin/builtin.go?m=text)

## 4. context

> [!note]
> `context` 可以先理解成“一个随请求向下传递的控制器”。它最核心的作用是传递取消信号、超时/截止时间，以及少量请求级数据。

### 4.1 `context` 是干什么的

Go 标准库对 `context` 的定义很明确：

> `Context` 用来在 API 边界和进程之间传递 **截止时间（deadline）**、**取消信号（cancellation signal）** 和 **请求级别的值（request-scoped values）**。

你可以把它先理解成：

> 一个随请求向下传递的“控制器”，用来告诉下面所有 goroutine：“这活别干了”，“超时了”，“请求已经结束了”。

这也是它在“协程级联退出、超时控制”里特别关键的原因。

### 4.2 它为什么能控制“级联退出”

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

### 4.3 `Context` 最核心的 4 个能力

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

### 4.4 最常用的几个创建方式

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

### 4.5 为什么总说“要记得调用 cancel”

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

### 4.6 在 goroutine 级联退出里怎么用

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

### 4.7 为什么它对“大模型流式长输出”特别关键

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

### 4.8 在网络请求拦截里为什么也关键

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

### 4.9 `context` 和 channel 的关系

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

### 4.10 `WithValue` 要谨慎

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

### 4.11 面试速答版

- `context` 的核心作用是向下传播取消信号、超时/截止时间，以及少量请求级数据
- `Context` 是有父子关系的，父 `Context` 取消后，子 `Context` 会级联取消
- 最核心的 4 个能力是 `Done`、`Err`、`Deadline`、`Value`
- 常用派生方式是 `WithCancel`、`WithTimeout`、`WithDeadline`、`WithValue`
- `WithCancel` / `WithTimeout` / `WithDeadline` 返回的 `cancel` 应该及时调用
- 在 goroutine 里最常见的退出方式是 `select { case <-ctx.Done(): return }`
- `ctx.Done()` 本质上是一个只读 channel，所以它和 goroutine、channel 能天然配合
- `WithValue` 只适合传 request-scoped data，不适合传普通业务参数

### 4.12 参考资料

- [context 包文档](https://pkg.go.dev/context)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
- [context 源码](https://go.dev/src/context/context.go)

## 5. sync：`Mutex`、`RWMutex`、`WaitGroup`

> [!note]
> 这三个原语的定位可以先一句话记住：`Mutex` 负责互斥，`RWMutex` 负责读写分离，`WaitGroup` 负责等待一组任务结束。

### 5.1 先记三者的定位

- `Mutex`：互斥，任何时刻只允许一个 goroutine 进入临界区
- `RWMutex`：读写锁，允许多个读者并发，但写者独占
- `WaitGroup`：不是锁，而是“等一组任务结束”的计数同步器

官方文档也提醒：大多数同步问题不必强行用 channel，适合用锁的时候，`Mutex` 往往更直接。

### 5.2 `Mutex`：什么时候用

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

### 5.3 `RWMutex`：什么时候用

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

### 5.4 `WaitGroup`：什么时候用

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

### 5.5 `WaitGroup` 的易错点

当前文档里有几条非常容易考：

- **正数的 `Add` 应该发生在对应 goroutine 启动之前**，否则 `Wait` 可能先返回
- 一个 `WaitGroup` 若要复用到下一轮任务，新的 `Add` 必须发生在前一轮 `Wait` 返回之后
- `Add` 把计数加成负数会直接 `panic`
- `WaitGroup` 使用后不能复制

所以 `WaitGroup` 的重点不是“线程安全计数器”这几个字，而是：

> 它只负责协调“什么时候都结束了”，不负责保护共享数据。

### 5.6 `WaitGroup` 的底层要点

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

### 5.7 `Mutex` 的正常模式和饥饿模式

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

### 5.8 `RWMutex` 的底层思路

`RWMutex` 内部不是“很多把锁”，而是组合了一个普通 `Mutex` 和若干计数/信号量字段来协调读者和写者。

对外暴露的关键语义是：

- 可有任意多个 reader 或 1 个 writer
- 若 writer 已经在等或持有锁，新的 reader 会被挡住
- 这样保证 writer 最终能获得锁

所以它的本质更像：

> 读者计数 + 写者闸门 + 唤醒协调

而不是“读操作完全无成本”。这也是为什么在写并不少时，`RWMutex` 不一定比 `Mutex` 更快。

### 5.9 三者怎么选

最实用的经验是：

- **`Mutex`**：默认首选，保护共享状态最稳
- **`RWMutex`**：只有在读明显多、且读临界区有一定成本时才考虑
- **`WaitGroup`**：只负责等待任务完成，不负责保护共享数据

很常见的组合就是：

- 用 `Mutex/RWMutex` 保护共享数据
- 用 `WaitGroup` 等待 goroutine 退出

### 5.10 面试速答版

- `Mutex` 适合保护共享可变状态，是默认首选的互斥原语
- `RWMutex` 适合读多写少场景，允许多个 reader 并发，但 writer 独占
- 一旦 writer 在等，新的 reader 会被阻塞，以保证写者最终拿到锁
- `WaitGroup` 不是锁，而是等待一组任务完成的计数同步器
- `WaitGroup` 的本质可以理解为“原子计数 + 信号量唤醒”
- `Mutex` 当前实现有 normal mode 和 starvation mode 两种
- 正常模式偏吞吐量，饥饿模式偏公平性
- 一般先用 `Mutex`，只有读明显远多于写时再考虑 `RWMutex`

### 5.11 参考资料

- [sync 包文档](https://pkg.go.dev/sync)
- [Go Wiki: Use a sync.Mutex or a channel?](https://go.dev/wiki/MutexOrChannel)
- [RWMutex 源码](https://go.dev/src/sync/rwmutex.go)
- [WaitGroup 源码](https://go.dev/src/sync/waitgroup.go)
- [internal/sync/mutex.go](https://go.dev/src/internal/sync/mutex.go)

## 6. 并发模型设计：EventLoop、单消费者串行队列、工具调用链

> [!note]
> 这一块更偏架构与工程设计，不是死记源码。可以先把它理解成：用 goroutine 提供并发执行单元，用 channel 提供有边界的消息流和同步点，再用 context / queue / state machine 把系统收束成稳定的执行模型。

### 6.1 EventLoop 模型：核心思想是什么

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

### 6.2 单消费者串行队列：为什么它特别常用

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

### 6.3 高稳定的工具自主调用链：怎么设计

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

### 6.4 一个推荐的稳定模型

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

### 6.5 常见反模式

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

### 6.6 面试速答版

- 在 Go 里构建高稳定并发模型，一个核心思路是：goroutine 负责并发执行，channel 负责事件流和同步边界，复杂状态收敛到单 goroutine 的 EventLoop 中串行推进
- EventLoop 适合“有状态 + 顺序敏感 + 并发输入很多”的场景，本质是并发输入、串行落地
- 单消费者串行队列是 EventLoop 的常见特例：很多生产者投递，一个消费者顺序处理
- 工程上要特别注意队列有界、失败分级、批处理、背压和可取消性
- 工具自主调用链推荐“控制面串行，执行面受限并发”
- 工具 worker 只产出结果事件，不直接改主状态
- 所有链路都应挂在统一 `ctx` 下，支持超时、取消和优雅退出
- 稳定系统最怕的反模式是：共享状态到处写、无界队列、取消后后台还继续跑、工具无限重试
