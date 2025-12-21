---
title: Pixiu 性能问题调查
tags: []
categories: []
date: 2025-12-21T18:53:59+08:00
draft: true
---
### 问题

在 benchmark 中，triple 协议的性能很差，需要排查原因，提升性能。

```
triple protocol performance test
      Name                | N   | Min   | Median | Mean  | StdDev | Max  
      ===================================================================
      SayHello [duration] | 500 | 100µs | 200µs  | 300µs | 300µs  | 2.6ms

pixiu to triple protocol performance test
      Name                | N   | Min    | Median | Mean | StdDev | Max   
      ====================================================================
      SayHello [duration] | 490 | 10.1ms | 12.7ms | 14ms | 4.1ms  | 43.3ms
```

### 复现过程

filter 经过 apiconfig，loadbalancer，remote 进行远程调用。