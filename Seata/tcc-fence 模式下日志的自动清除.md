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

#### 1. 配置文件

在 `config` 模块中新增了 `Config` 结构体，用于配置 TCC Fence 日志清理功能的相关参数。

```
type Config struct {
    Enable       bool          `yaml:"enable" json:"enable" koanf:"enable"`  
    Url          string        `yaml:"url" json:"url" koanf:"url"`  
    LogTableName string        `yaml:"log-table-name" json:"log-table-name" koanf:"log-table-name"`  
    CleanPeriod  time.Duration `yaml:"clean-period" json:"clean-period" koanf:"clean-period"`  
}
```

- **Enable**: 是否启用日志清理功能。
- **Url**: 数据库连接字符串。
- **LogTableName**: TCC 日志表的名称。
- **CleanPeriod**: 清理任务的执行周期。

#### 2. 初始化函数

在客户端的 `InitTCC` 函数中添加了对 `fence` 的初始化逻辑。

```
func InitTCC(cfg fence.Config) {  
    fence.InitFenceConfig(cfg)
    rm.GetRmCacheInstance().RegisterResourceManager(GetTCCResourceManagerInstance()) 
}
```

#### 3. 配置初始化

在 `InitFenceConfig` 函数中，根据配置参数初始化相关组件，并启动清理任务。

```
func InitFenceConfig(cfg Config) {  
    FenceConfig = cfg  
  
    if FenceConfig.Enable {  
        dao.GetTccFenceStoreDatabaseMapper().InitLogTableName(FenceConfig.LogTableName)  
        handler.GetFenceHandler().InitCleanPeriod(FenceConfig.CleanPeriod)  
        config.InitCleanTask(FenceConfig.Url)  
    }  
}
```

#### 4. 清理任务初始化

在 `InitLogCleanChannel` 函数中，初始化了数据库连接、日志清理 channel 和定时任务。


```
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

##### 4.1 数据库连接

通过 `sql.Open` 函数连接到 MySQL 数据库。

##### 4.2 清理日志的 channel

启动 `traversalCleanChannel` goroutine，持续从 channel 中取出日志并进行清理。

##### 4.3 定时任务

启动 `initLogCleanTask` goroutine，定时（默认五分钟）查找一天之前的数据，并将其放入清理 channel 中。

### 空回滚问题

[issue](https://github.com/apache/incubator-seata-go/issues/685)

