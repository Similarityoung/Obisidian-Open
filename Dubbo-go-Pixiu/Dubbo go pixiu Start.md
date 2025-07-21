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

### 使用 goLand 配置来 debug

1. 选择 go build 
2. Run kind 选择 Directory
3. Directory 选择 你需要执行 go 文件所在的目录
4. Working directory 根目录即可
5. Program arguments 程序实参上填 gateway start -c pathToConfig/conf.yaml