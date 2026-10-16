---
title: HTTP 与接口
type: notes
slug: interview-http-api
summary: "归纳 Cookie、Session 与接口幂等性的基础概念和实现边界。"
date: 2026-04-02
draft: false
categories:
  - Backend
tags:
  - interview
---

# HTTP 与接口

## Cookie 与 Session

HTTP 请求本身不保存会话状态。Cookie 是浏览器保存、在满足域名和路径等条件时随请求携带的数据；Session 通常是服务端保存的会话状态。

常见登录流程：服务端建立 Session，把 Session ID 通过 Cookie 返回；浏览器后续携带该 ID，服务端据此查找登录状态。Cookie 是载体，Session 是状态管理方式；使用 Token 的认证方案也可能借助 Cookie 传输。

## 接口幂等

同一业务操作执行一次或多次，产生的业务效果相同。常见于支付回调、消息重复投递和接口超时重试；不要求每次响应内容完全一致。

实现时使用稳定的业务唯一标识，并让去重与业务修改具有一致的提交边界。例如，在同一个数据库事务中插入带唯一约束的消费记录，再更新业务数据；重复 ID 触发约束后不再执行修改。

“先修改业务，再单独写完成标记”中间如果崩溃，重试仍可能重复执行。Redis 的临时标记也有过期和故障边界，不能直接代替业务一致性保证。
