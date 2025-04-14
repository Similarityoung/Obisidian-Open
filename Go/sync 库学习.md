---
title: sync
tags:
  - learn
categories:
  - Go
date: 2025-04-14T18:00:23+08:00
draft: true
---
### sync.pool

今天看 dubbo-go-pixiu 源码的时候看见了 sync.pool 的类型，于是学习了下：

```go
// CreateHttpConnectionManager create http connection managerfunc CreateHttpConnectionManager(hcmc *model.HttpConnectionManagerConfig) *HttpConnectionManager {  
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

这里 `hcm.pool.New` 就是定义一个方法，当 `pool` 中没有东西的时候，调用 `get` 方法便会生成一个类型。这里的 `func() interface{}` 表示的是一个函数，返回值是 `interface{}` 这是空指针，意味着可以返回任意类型，因为任意类型都实现了空指针。

具体用法如下：

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
	fmt.Println(obj) // 输出: default value

	// 放回对象
	pool.Put("reused value")

	// 再次获取对象
	obj = pool.Get()
	fmt.Println(obj) // 输出: reused value

	// 池中无对象时再次调用 Get
	obj = pool.Get()
	fmt.Println(obj) // 输出: default value
}
```

