---
title: sync.Pool 对象复用
tags:
  - learn
categories:
  - Go
date: 2025-04-14T18:00:23+08:00
draft: true
---

# sync.Pool 对象复用

今天看 dubbo-go-pixiu 源码的时候看见了 `sync.Pool` 的类型，于是学习了下。

## Pixiu 中的入口

```go
// CreateHttpConnectionManager create http connection manager
func CreateHttpConnectionManager(hcmc *model.HttpConnectionManagerConfig) *HttpConnectionManager {
    hcm := &HttpConnectionManager{config: hcmc}
    hcm.pool.New = func() interface{} {
       return hcm.allocateContext()
    }
    hcm.routerCoordinator = router2.CreateRouterCoordinator(&hcmc.RouteConfig)
    hcm.filterManager = filter.NewFilterManager(hcmc.HTTPFilters)
    hcm.filterManager.Load()
    return hcm
}
```

这里的 `New` 在 `Get` 没有取到可复用对象时创建一个 `HttpContext`。`interface{}` 是空接口，可以承载不同类型的值，并不是空指针。

## Get、Put 和 New

`sync.Pool` 用来复用临时对象，减少分配和 GC 压力。`Get` 取对象，`Put` 归还对象；没有可用对象时，`Get` 调用 `New`，未设置 `New` 则返回 `nil`。

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	// 创建一个 sync.Pool
	pool := sync.Pool{
		New: func() interface{} {
			return "default value"
		},
	}

	// 从池中获取对象
	obj := pool.Get()
	fmt.Println(obj) // 此例中返回 default value

	// 放回对象
	pool.Put("reused value")

	// 再次获取对象
	obj = pool.Get()
	fmt.Println(obj) // 可能是 reused value，也可能重新调用 New

	// 池中无对象时再次调用 Get
	obj = pool.Get()
	fmt.Println(obj) // 此例中返回 default value
}
```

`Put` 不保证下一次 `Get` 取回同一个对象。池中的对象可能随时被移除，因此不能用它维护必须长期保存的状态。

## 使用边界

- 池的操作支持并发，不代表取出的对象可以被多个 goroutine 同时修改。
- 归还前清理请求残留，归还后不要再访问对象，也不要重复归还同一对象。
- 适合临时缓冲区、请求处理中的临时对象；需要明确关闭和数量控制的网络连接，应由专门的连接池管理。
- 首次使用后不能复制 `Pool`。

参考：[Go sync.Pool 文档](https://pkg.go.dev/sync#Pool)。
