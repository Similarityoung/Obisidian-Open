---
title: Maven 插件开发
tags:
  - maven
categories:
  - Java
date: 2024-10-31T18:31:07+08:00
draft: true
---

# Maven 插件开发

今天看了 `dubbo-maven-plugin` 里的 `DubboProtocCompilerMojo` 类，记录 Maven 插件开发的几个概念。

## Goal 与 @Mojo

Mojo 是插件目标（Goal）的实现。`@Mojo` 提供目标名称和执行相关元信息：

| 属性 | 含义 |
| --- | --- |
| `name` | Goal 名称，可通过 `mvn <plugin-prefix>:<goal>` 调用 |
| `defaultPhase` | 配置该 Goal 执行时可使用的默认生命周期阶段 |
| `requiresDependencyResolution` | 执行前需要解析的依赖范围 |
| `threadSafe` | 声明实现是否支持并行构建；不会自动让代码线程安全 |

```java
@Mojo(
    name = "compile",
    defaultPhase = LifecyclePhase.GENERATE_SOURCES,
    requiresDependencyResolution = ResolutionScope.COMPILE,
    threadSafe = true
)
```

这个目标与 `generate-sources` 阶段相关，需要编译范围的依赖。具体参数通过 `@Parameter` 定义，再由 POM 或命令行传入。仅声明 `defaultPhase` 并不等于所有项目都会自动执行该插件。

## 生命周期与阶段

Maven 的 `default`、`clean`、`site` 是三条不同的生命周期。

默认构建生命周期的常见顺序：

```text
validate → initialize
generate-sources → process-sources
generate-resources → process-resources
compile → process-classes
generate-test-sources → process-test-sources
generate-test-resources → process-test-resources
test-compile → process-test-classes → test
prepare-package → package
pre-integration-test → integration-test → post-integration-test
verify → install → deploy
```

调用某个阶段，会先执行同一生命周期中排在它前面的阶段。`install` 安装到本地仓库，`deploy` 发布到远程仓库。

另外两条生命周期分别是：

- `pre-clean → clean → post-clean`。
- `pre-site → site → post-site → site-deploy`。

`LifecyclePhase.NONE` 表示未指定默认阶段，不是一个构建阶段。代码生成器内部的处理过程见 [[Dubbo/Protobuf 代码生成]]。
