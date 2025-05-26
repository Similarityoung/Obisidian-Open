---
title: Dubbo go pixiu Start
tags:
  - Dubbo
categories:
  - Gateway
date: 2025-04-28T14:29:01+08:00
draft: true
---
### run 命令

```shell
 // 步骤 1 启动网关
 go run cmd/pixiu/*.go gateway start -c configs/conf.yaml
 // 步骤 2 启动服务
 go run app/*
 // 步骤 3 运行测试
 go test 
```

### samples 运行命令

```shell
 go run pixiu/*.go gateway start -c pathToConfig/conf.yaml
```

