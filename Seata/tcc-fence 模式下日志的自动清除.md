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

