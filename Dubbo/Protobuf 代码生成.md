---
title: Protobuf 代码生成
tags:
  - Dubbo
categories:
  - Dubbo
date: 2024-10-30T11:28:05+08:00
draft: true
---

# Protobuf 代码生成

对 `org.apache.dubbo.gen.AbstractGenerator` 的源码学习摘记，最初由 GPT-4 辅助解析。

## 输入与输出

输入是 Protobuf 的文件、服务和方法描述。生成器整理类型和上下文，再用 Mustache 模板生成 Java 接口或实现。

## 调用过程

1. `generateFiles` 筛选需要生成的 Proto 文件，使用 `ProtoTypeMap` 建立类型映射。
2. `findServices` 遍历服务定义，处理多文件选项。
3. `buildServiceContext` 和 `buildMethodContext` 整理文件名、类名、方法和参数，并通过源文件位置信息提取注释。
4. `applyTemplate` 将上下文填入模板，生成目标文件。

`ServiceContext` 与 `MethodContext` 分别承载服务和方法的信息。这里值得关注的是：描述解析与模板输出分开，模板只消费已经整理好的上下文。

Maven 插件侧的入口见 [[Java/Maven 插件开发]]。
