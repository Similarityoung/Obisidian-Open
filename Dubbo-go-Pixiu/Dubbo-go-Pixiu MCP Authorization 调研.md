---
title: Dubbo-go-Pixiu MCP Authorization 调研
tags:
  - Dubbo
  - learn
categories:
  - Dubbo
  - Go
date: 2025-07-26T21:56:41+08:00
draft: true
---
##   Authorization Flow  授权流程

### Roles

A protected _MCP server_ acts as an [OAuth 2.1 resource server](https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-13.html#name-roles), capable of accepting and responding to protected resource requests using access tokens.

受保护的 MCP 服务器充当 [OAuth 2.1 资源服务器](https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-13.html#name-roles) ，能够使用访问令牌接受和响应受保护的资源请求。

Pixiu 网关既然是将后端 API 暴露成 MCP Server，