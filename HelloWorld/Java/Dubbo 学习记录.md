---
title: Dubbo 学习记录
tags:
  - Dubbo
categories:
  - Back
date: 2024-10-30T11:28:05+08:00
draft: true
---
## maven仓库

使用框架和开发框架是两种不同的思路。在看 dubbo 源码的时候，我发现很多依赖并没有很好的导入，然后考虑是不是 maven 仓库配置有问题，于是看到了这样的一篇文章，有关 idea 中 `bundled` 和 `maven wrapper` 的区别。[链接](https://stackoverflow.com/questions/72212706/maven-wrapper-vs-bundle-maven-3)

具体来说就是`bundled` 是 idea 自带的 maven 版本，但是 dubbo 为了协同开发，自定义了一个 `wrapper` 来让所有人的 maven 版本一致（大概是这样？）

修改成 `maven wrapper` 依赖就全部导入成功了，准备来看看源码。

![image.png](https://img.simi.host/20241030113857.png)

## 基于 GPT-4 生成的解析

这段代码是一个为 Apache Dubbo（一个高性能的 Java RPC 框架）生成代码的抽象生成器。它使用了多个技术，包括 Java、Protocol Buffers（ProtoBuf）和 Mustache 模板引擎来动态生成代码。让我们逐步了解这段代码的关键部分：

### 包和导入
代码位于 `org.apache.dubbo.gen` 包中，引入了多个包来支持其功能，例如 Google 的 ProtoBuf 库、Java 注解库和 Mustache 模板引擎。

### 类定义
- `AbstractGenerator` 是一个抽象类，定义了用于生成代码的基本框架和工具方法。它的主要目的是提供一个可扩展的基础，其他生成器可以通过扩展这个类并提供具体的实现细节来满足特定的生成需求。

### 关键方法和内部类

1. **generateFiles** 方法:
   - 这是类的核心方法之一，它处理 ProtoBuf 文件的解析和服务的查找，然后基于服务定义生成代码。
   - 使用 `ProtoTypeMap` 类来帮助映射 ProtoBuf 类型到 Java 类型。
   - 过滤和处理只有明确指定生成的 ProtoBuf 文件。
   - 对每个服务生成代码文件。

2. **findServices** 方法:
   - 这个方法遍历 ProtoBuf 描述文件，提取服务定义并构建服务上下文。
   - 它处理多文件选项和服务中的方法，生成每个服务的上下文。

3. **buildServiceContext** 和 **buildMethodContext** 方法:
   - 这些方法分别构建服务和方法的上下文信息，包括 JavaDoc 注释的生成、方法名称的处理等。
   - 使用路径和位置信息来定位和提取 ProtoBuf 文件中的注释。

4. **applyTemplate** 方法:
   - 利用 Mustache 模板引擎根据上下文动态生成代码。
   - 模板文件根据具体的类名和方法生成对应的服务接口或实现。

5. **内部类 `ServiceContext` 和 `MethodContext`**:
   - 这些类是为了存储解析 ProtoBuf 服务定义和方法定义时需要的上下文信息。
   - 包括文件名、类名、方法信息、注释等。

### 使用模板和代码生成
生成器通过模板将解析得到的服务上下文填充到指定的代码模板中，这些模板定义了生成的 Java 代码的结构和样式，确保生成的代码符合 Dubbo 和 ProtoBuf 的约定。

整个类是一种设计模式的实现，特别适用于需要根据一些元数据（这里是 ProtoBuf 文件）动态生成代码的场景。通过这种方式，Dubbo 可以为不同的服务自动创建需要的接口和类，极大地简化了开发工作。

