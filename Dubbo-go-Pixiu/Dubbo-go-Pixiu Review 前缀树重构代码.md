---
title: Dubbo-go-Pixiu Review 前缀树重构代码
tags:
  - Dubbo
categories:
  - Dubbo
date: 2025-11-17T23:55:10+08:00
draft: true
---

## Review Update Route Mechanism

PR 链接： https://github.com/apache/dubbo-go-pixiu/pull/777

社区的小伙伴重构了 Pixiu 的路由模块，遂进行读取瞻仰，希望能有所收获，

### RouteSnapshot 路由存储策略

核心结构体 `RouteSnapshot` 将路由规则分为了**两大阵营**，以应对不同的匹配需求：

#### 1. 基于路径的路由 (`MethodTries`)

- **数据结构**：`map[string]*trie.Trie`
	
- **存储逻辑**：
	
    - **第一层（分流）**：使用 Map 按 **HTTP 方法**（GET, POST, PUT...）分类。
        
    - **第二层（匹配）**：每个方法对应一棵 **前缀树 (Trie)**。
        
- **设计优势**：
    
    - **查询快**：Trie 树查询复杂度仅与路径长度相关，适合海量 URL。
		
	- **空间省**：公共前缀（如 `/api/v1/`）只存储一次。
		
	- **逻辑简**：先锁定方法再查树，树节点内无需再判断 HTTP 方法。
	
- **入选条件**：只要配置了 `Path`（精确路径）或 `Prefix`（前缀路径），无论是否包含 Header，都存入这里。

#### 2. 纯 Header 路由 (`HeaderOnly`)

- **数据结构**：`[]HeaderRoute` (切片/列表)

- **存储逻辑**：简单列表，匹配时需要遍历。

- **设计原因**：Header 是键值对，没有路径那样的层级关系（Hierarchy），无法构建 Trie 树，只能线性存储。

- **入选条件**：**必须同时满足** `Path` 为空 **且** `Prefix` 为空。即“不看路径，只看 Header”的特殊路由。

#### 3. 架构示意图 (Mermaid)

``` mermaid
graph TD
    subgraph RouteSnapshot [路由快照核心结构]
        direction TB
        
        RS[RouteSnapshot] -->|1. 路径路由| MT[MethodTries map]
        RS -->|2. 无路径路由| HO[HeaderOnly slice]
        
        subgraph Tries [MethodTries: 空间换时间]
            MT -->|key: GET| TrieGET[GET 前缀树]
            MT -->|key: POST| TriePOST[POST 前缀树]
            
            TrieGET --> Node1((/api))
            Node1 --> Node2((/user))
            Node1 --> Node3((/order))
        end
        
        subgraph List [HeaderOnly: 线性遍历]
            HO --> Rule1[规则A: Headers包含 version=v1]
            HO --> Rule2[规则B: Headers包含 token=xyz]
        end
    end
```

