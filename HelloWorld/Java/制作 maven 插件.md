---
title: 制作 maven 插件
tags: [maven]
categories: [Back]
date: 2024-10-31T18:31:07+08:00
draft: true
---
今天看了有关 `dubbo-maven-plugin` 里面的 `DubboProtocCompilerMojo` 类，是有关 maven 插件制作的代码

### @Mojo 注解

`@Mojo` 注解是 Maven 插件开发中的一个核心注解，它用于标记一个类为 Maven 的目标（Goal）实现。这个注解告诉 Maven，标记的类是一个 Mojo（Maven plain Old Java Object），是一个可执行的目标。

这个注解的属性定义了如何处理和执行这个 Mojo，具体用途如下：

1. **name**：定义了执行这个 Mojo 的命令名称，如 `mvn <plugin-prefix>:name`。

2. **defaultPhase**：指定该 Mojo 应该绑定到 Maven 生命周期的哪个阶段。例如，`LifecyclePhase.GENERATE_SOURCES` 表示在生成源代码的阶段执行。

3. **requiresDependencyResolution**：指明 Maven 在执行这个 Mojo 之前需要进行的依赖解析的程度。例如，`ResolutionScope.COMPILE` 表示需要解析编译阶段的依赖。

4. **threadSafe**：指示这个 Mojo 是否是线程安全的，这对于并行构建非常重要。

5. **configuration**：尽管不直接在注解中定义，但 Mojo 可以通过 `@Parameter` 注解来配置其参数，这些参数可以通过项目的 POM 文件或命令行来配置。

使用 `@Mojo` 注解的好处是，它允许开发者以一种声明式的方式来定义插件的行为和配置，而无需编写传统的 XML 插件描述信息。这样简化了插件的创建和维护过程，使 Maven 插件开发更加直观和易于理解。


