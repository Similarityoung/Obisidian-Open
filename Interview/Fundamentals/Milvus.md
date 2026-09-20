---
title: Milvus
tags:
  - interview
  - milvus
categories:
  - Interview
date: 2026-04-02
draft: false
---

# Milvus

## Collection、分区与过滤

文档结构、索引配置相同，只是分类不同，可以先在同一个 Collection 内使用分类字段过滤。需要缩小检索范围时，再考虑分区或分区键。

- 分类有限且稳定：可以显式指定分区。
- 分类数量多、变化频繁：避免每类手动建一个分区；结合标量过滤或分区键评估。
- Schema、索引、生命周期或隔离要求明显不同：考虑拆 Collection。

哪种更快取决于数据分布、过滤选择性和负载，不能仅凭“分区比 Collection 快”下结论。
