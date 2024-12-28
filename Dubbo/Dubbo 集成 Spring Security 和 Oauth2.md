---
title: Dubbo 集成 Spring Security 和 OAuth2
tags:
  - Dubbo、
categories:
  - Back
date: 2024-12-26T21:04:46+08:00
draft: true
---
### 定义与基本概念

`Spring Security` 是一个基于 Spring 框架的安全框架，为 Java 企业级应用提供了全面的安全解决方案，涵盖了身份验证（用户登录）、授权（访问控制）、加密和防止常见的安全漏洞等功能。它可以集成到各种类型的 Spring 应用中，包括 Web 应用（如 Spring MVC、Spring Boot）和非 Web 应用。

`OAuth2`（开放授权 2.0）是一个开放标准的授权框架，旨在解决不同应用之间的授权问题，允许用户在不向第三方应用透露自己的用户名和密码的情况下，授权第三方应用访问他们存储在另一个服务提供商上的资源。它通过使用令牌`Token`来代表用户的授权，使得资源服务器能够验证请求是否被授权。

#### 核心角色与流程

 - **资源所有者**：通常是用户，拥有受保护的资源。

- **资源服务器**：存储资源的服务器，需要对请求进行授权验证。

- **客户端**：请求访问资源的应用程序。

- **授权服务器**：负责验证资源所有者的身份，并发放令牌给客户端

客户端请求资源所有者授权，资源所有者同意后，授权服务器向客户端发放令牌，客户端携带令牌访问资源服务器，资源服务器验证令牌的有效性后提供资源。

#### 与 `Dubbo` 的协同

同时低版本 `javax` 和高版本 `jakarta servlet API` ，`jakarta API` 优先级更高，只需要引入jar即可使用`HttpServletRequest`和`HttpServletResponse`作为参数

**使用 Filter 扩展**: 实现 `Filter` 接口和 `org.apache.dubbo.rpc.protocol.tri.rest.filter.RestExtension` 接口，然后注册SPI

