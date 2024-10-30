---
title: Dubbo 学习记录
tags:
  - Dubbo
categories:
  - Back
date: 2024-10-30T11:28:05+08:00
draft: true
---
### maven仓库

使用框架和开发框架是两种不同的思路。在看 dubbo 源码的时候，我发现很多依赖并没有很好的导入，然后考虑是不是 maven 仓库配置有问题，于是看到了这样的一篇文章，有关 idea 中 `bundled` 和 `maven wrapper` 的区别。[链接](https://stackoverflow.com/questions/72212706/maven-wrapper-vs-bundle-maven-3)

具体来说就是`bundled` 是 idea 自带的 maven 版本，但是 dubbo 为了协同开发，自定义了一个 `wrapper` 来让所有人的 maven 版本一致（大概是这样？）

修改成 `maven wrapper` 依赖就全部导入成功了，准备来看看源码。

![image.png](https://img.simi.host/20241030113857.png)
