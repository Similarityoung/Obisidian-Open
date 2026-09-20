---
title: HTTP 会话
tags:
  - interview
  - http
categories:
  - Interview
date: 2026-04-02
draft: false
---

# HTTP 会话

HTTP 请求本身不保存会话状态。Cookie 是浏览器保存、在满足域名和路径等条件时随请求携带的数据；Session 通常是服务端保存的会话状态。

常见登录流程：服务端建立 Session，把 Session ID 通过 Cookie 返回；浏览器后续携带该 ID，服务端据此查找登录状态。Cookie 是载体，Session 是状态管理方式；使用 Token 的认证方案也可能借助 Cookie 传输。
