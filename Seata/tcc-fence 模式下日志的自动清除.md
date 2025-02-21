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

在 `InitFenceConfig` 中，我根据配置的参数进行解析，配置清理任务

```go
func InitFenceConfig(cfg Config) {  
    FenceConfig = cfg  
  
    if FenceConfig.Enable {  
       dao.GetTccFenceStoreDatabaseMapper().InitLogTableName(FenceConfig.LogTableName)  
       handler.GetFenceHandler().InitCleanPeriod(FenceConfig.CleanPeriod)  
       config.InitCleanTask(FenceConfig.Url)  
    }  
}
```

关于 initCleanTask 的具体逻辑是：

```go
func (handler *tccFenceWrapperHandler) InitLogCleanChannel(dsn string) {  
  
    db, err := sql.Open("mysql", dsn)  
    if err != nil {  
       log.Warnf("failed to open database: %v", err)  
       return  
    }  
  
    handler.dbMutex.Lock()  
    handler.db = db  
    handler.dbMutex.Unlock()  
  
    handler.logQueueOnce.Do(func() {  
       go handler.traversalCleanChannel(db)  
    })  
  
    handler.logTaskOnce.Do(func() {  
       go handler.initLogCleanTask(db)  
    })  
  
}
```

1. 连接数据库
2. 初始化清除日志的 channel，并一直从 channel 中取数据清除
3. 初始化定时任务，每隔固定时间（默认是五分钟）查找一天之前的数据，放进清除 channel 中。
