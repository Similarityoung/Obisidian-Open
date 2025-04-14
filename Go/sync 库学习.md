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

