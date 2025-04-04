---
title: Dubbo ai 方向路线
tags: [ Dubbo]
categories: [Dubbo]
date: 2025-04-04T19:39:21+08:00
draft: true
---
第一步：改成 2 个 server，2 个 client，1 个前端

第二步：client 通过 nacos 走服务发现 server，而不是直接调用 server 地址

第三步：其中一个 client 调用两个模型（？）另一个 client 通过