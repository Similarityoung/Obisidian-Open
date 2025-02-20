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

