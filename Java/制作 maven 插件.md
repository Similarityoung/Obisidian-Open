---
title: 制作 maven 插件
tags:
  - maven
categories:
  - Java
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

示例

```java
@Mojo(  
    name = "compile",  
    defaultPhase = LifecyclePhase.GENERATE_SOURCES,  
    requiresDependencyResolution = ResolutionScope.COMPILE,  
    threadSafe = true  
)
```

#### maven 生命周期

在 Maven 中，项目构建的整个过程被细分为不同的阶段，这些阶段组合形成了一个完整的构建生命周期。这里列出的各个阶段是 Maven 构建和部署过程的组成部分，每个阶段都是项目构建流程中的一个步骤。以下是这些阶段的简要说明：

1. **VALIDATE** - 验证项目是否正确，所有必需的信息都是可用的。
    
2. **INITIALIZE** - 初始化构建状态，例如设置属性或创建目录。
    
3. **GENERATE_SOURCES** - 生成额外的源代码，如通过代码生成或从其他文件。
    
4. **PROCESS_SOURCES** - 处理项目的源代码，例如编译前的代码增强。
    
5. **GENERATE_RESOURCES** - 生成额外的资源文件，这些文件可以被包含在最终的包中。
    
6. **PROCESS_RESOURCES** - 复制和处理资源到目标目录，准备打包。
    
7. **COMPILE** - 编译项目的源代码。
    
8. **PROCESS_CLASSES** - 处理编译生成的文件，比如字节码增强。
    
9. **GENERATE_TEST_SOURCES** - 为测试生成额外的源代码。
    
10. **PROCESS_TEST_SOURCES** - 处理测试源代码。
    
11. **GENERATE_TEST_RESOURCES** - 生成测试所需的额外资源。
    
12. **PROCESS_TEST_RESOURCES** - 复制和处理测试资源。
    
13. **TEST_COMPILE** - 编译测试源代码。
    
14. **PROCESS_TEST_CLASSES** - 处理测试编译生成的文件。
    
15. **TEST** - 使用适当的测试框架运行测试，这些测试代码不会被打包或部署。
    
16. **PREPARE_PACKAGE** - 执行必要的任务，为打包做准备。
    
17. **PACKAGE** - 打包编译好的代码，通常生成 JAR 或 WAR 文件。
    
18. **PRE_INTEGRATION_TEST** - 执行集成测试前的准备。
    
19. **INTEGRATION_TEST** - 处理和运行集成测试。
    
20. **POST_INTEGRATION_TEST** - 完成集成测试后进行清理。
    
21. **VERIFY** - 检查包的质量，运行检查以验证包符合质量标准。
    
22. **INSTALL** - 将包安装到本地仓库，供本地其他项目使用。
    
23. **DEPLOY** - 在构建环境结束后，将最终的包版本发布到远程仓库供其他开发者和项目使用。
    
24. **PRE_CLEAN** - 执行实际清理前的工作。
    
25. **CLEAN** - 清理之前构建生成的所有文件。
    
26. **POST_CLEAN** - 完成清理后执行的工作。
    
27. **PRE_SITE** - 执行生成项目站点前的工作。
    
28. **SITE** - 生成项目的站点文档。
    
29. **POST_SITE** - 完成站点生成后执行的工作。
    
30. **SITE_DEPLOY** - 将生成的站点文档发布到服务器上。
    
31. **NONE** - 不对应具体阶段，通常用于特殊情况。