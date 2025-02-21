---
title: tcc-fence 模式下日志的自动清除
tags: [pr]
categories: [Seata]
date: 2025-02-21T02:51:10+08:00
draft: true
---
### [issue 关联](https://github.com/apache/incubator-seata-go/issues/699)

>1. 先查出可以清理的数据
>2. 按索引删除数据
>3. 给delete加上limit

查询代码后发现，在 tcc-fence 模式下并不存在自动删除日志的功能，于是准备实现该功能。
### [pull request](https://github.com/apache/incubator-seata-go/pull/745)

首先在 `config` 中添加内容，在 fence.go 内添加

```go
type Config struct {  
    Enable       bool          `yaml:"enable" json:"enable" koanf:"enable"`  
    Url          string        `yaml:"url" json:"url" koanf:"url"`  
    LogTableName string        `yaml:"log-table-name" json:"log-table-name" koanf:"log-table-name"`  
    CleanPeriod  time.Duration `yaml:"clean-period" json:"clean-period" koanf:"clean-period"`  
}
```

并在客户端的 `InitTCC` 函数中添加了对 `fence` 的初始化

```go
func InitTCC(cfg fence.Config) {  
	fence.InitFenceConfig(cfg)
	rm.GetRmCacheInstance()
	.RegisterResourceManager(GetTCCResourceManagerInstance()) 
}
```

