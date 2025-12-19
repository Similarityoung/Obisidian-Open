---
title: 阅读 TODO
tags: []
categories: []
date: 2025-12-19T17:33:32+08:00
draft: true
---
### **深度解析：核心可修改论文清单**

#### **Paper 1: HippoRAG (NeurIPS 2024)**

- 1. 一句话核心本质：利用个性化PageRank（PPR）算法在知识图谱上模拟大脑海马体的联想记忆，替代昂贵的LLM进行多跳推理检索 。
    
- 2. KG在系统中的角色：**Retrieval-time navigation (检索时导航)**。KG不只是存储，而是计算引擎 。
    
- **3. 是否适合作为“可修改基线”？**
    
    - **✅ 是 (极力推荐)**。它的核心是一个数学算法（PPR），而不是复杂的黑盒模型。算法参数（如阻尼系数、边权重）非常容易修改，且无需训练，完全符合低算力要求 。
        
- **4. 具体的创新切入点 (Actionable Points)**：
    
    - **修改点 A (动态权重)**：原版PPR的边权重通常是静态的。你可以引入“Query-dependent Edge Weighting”，根据用户Query的语义（如关注因果还是关注并列），动态调整PPR传播时的边权重 。
        
    - **修改点 B (临时子图)**：原版需要在全局图上跑PPR。你可以提出“Ad-hoc Subgraph PPR”，即只提取Query相关的Top-k节点构建临时小图运行PPR，进一步降低内存消耗 。
        
- **5. 建议的毕业论文创新标题**：
    
    - _面向低资源环境的动态查询感知PageRank图检索方法 (Query-Aware Dynamic PageRank for Efficient Graph Retrieval)_
        

#### **Paper 2: SlimRAG (arXiv 2025)**

- 1. 一句话核心本质：为了反驳GraphRAG的高昂成本，提出只需构建“实体-文档块映射表”，检索后通过识别Query中的显著实体进行上下文硬过滤 。
    
- 2. KG在系统中的角色：**Post-retrieval pruning (检索后剪枝)**。KG退化为简单的实体映射表 。
    
- **3. 是否适合作为“可修改基线”？**
    
    - **✅ 是 (极佳的反面教材)**。SlimRAG做得太“绝”了，完全去掉了图结构。你的创新可以是“把图结构加回来一点点”，证明“轻量级结构 > 无结构”。
        
- **4. 具体的创新切入点 (Actionable Points)**：
    
    - **修改点 A (软剪枝)**：SlimRAG是硬过滤（有实体就留，没有就删）。你可以改为“基于1跳邻居的软评分机制”，如果一个Chunk虽然没有直接实体，但包含实体的直接邻居，也给予一定保留权重，防止误删 。
        
    - **修改点 B (混合索引)**：结合SlimRAG的实体表和轻量级文档关系，构建“混合索引”，在过滤时考虑文档间的逻辑连接，而不仅仅是实体匹配 。
        
- **5. 建议的毕业论文创新标题**：
    
    - _基于实体邻域扩展的鲁棒性RAG上下文剪枝策略 (Robust Context Pruning via Entity Neighborhood Expansion)_
        

#### **Paper 3: LogicRAG (AAAI 2026 Accepted)**

- 1. 一句话核心本质：不依赖预构建KG，而是根据Query动态生成“逻辑依赖图（DAG）”，利用逻辑路径对检索到的文档进行深度剪枝 。
    
- 2. KG在系统中的角色：**Post-retrieval / Reasoning Plan (推理规划)**。KG是动态生成的逻辑视图 。
    
- **3. 是否适合作为“可修改基线”？**
    
    - **✅ 是 (高价值)**。它解决了“RAG容易迷失”的问题，且明确提到减少了70%的Token消耗，非常适合低资源叙事 。
        
- **4. 具体的创新切入点 (Actionable Points)**：
    
    - **修改点 A (简化构建)**：原版可能依赖较强的LLM来生成逻辑图。你可以尝试用“关键词共现网络”或“简单依存句法分析”来替代LLM生成逻辑图，实现极低资源的逻辑剪枝 。
        
    - **修改点 B (双重验证)**：利用检索到的文档反向验证逻辑图的正确性，如果文档中没有支持逻辑关系的证据，则修正逻辑图。
        
- **5. 建议的毕业论文创新标题**：
    
    - _基于轻量级逻辑依赖图的自适应文档筛选与排序方法 (Adaptive Document Selection via Lightweight Logic Dependency Graphs)_
        

#### **Paper 4: ReGraphRAG (EMNLP 2025 Findings)**

- 1. 一句话核心本质：针对碎片化KG，通过语义重组和多视角扩展来修复图结构，提升检索召回率 。
    
- 2. KG在系统中的角色：**Index-time structural augmentation (索引时增强)** 。
    
- **3. 是否适合作为“可修改基线”？**
    
    - **⚠️ 中等**。虽然方法论很好，但“图重组”通常是离线且耗时的。如果你的论文侧重于“实时性”，这篇可能稍显笨重。
        
- **4. 具体的创新切入点 (Actionable Points)**：
    
    - **修改点**：将其“离线重组”改为“在线Lazy重组”。只有当Query命中某个碎片区域时，才即时触发局部的语义连接。
        
- **5. 建议的毕业论文创新标题**：
    
    - _面向碎片化知识的即时图结构补全与检索增强 (Just-in-Time Graph Completion for Fragmented Knowledge Retrieval)_
        

---

### **总结与建议 (Final Summary)**

#### **A. Top-3 我建议你积极修改的论文 (Most Modifiable)**

1. HippoRAG : 算法最纯粹（PageRank），没有任何模型训练负担，修改空间在于“如何定义图的权重”和“如何选择种子节点”，这是最安全的算法创新路线。
    
2. SlimRAG : 逻辑最简单，它是对GraphRAG的简化。你的工作可以在它基础上做“加法”（加回轻量级结构），非常容易写出Comparative Analysis（对比实验）。
    
3. LogicRAG : 效果最显著（Token减少），符合“低算力”叙事。修改重点在于“如何更便宜地获得逻辑图”。
    

#### **B. 仅适合作为基线/相关工作的论文 (Do Not Modify)**

- FRAG : 这是一个“框架”而非单一算法。修改整个框架工程量太大，且难以界定贡献点。
    
- KET-RAG : 它的核心是关键词二分图，这种结构比较死板，改进空间不如语义图大。
    
- **GraphRAG (Microsoft)**: 仅仅作为对比基线（Baseline）。因为它需要全量构建社区摘要，成本极高，不仅不能修改，还要在论文中作为“反面教材”来批判其高算力需求 。
    

#### **C. 毕业论文最稳妥的 3 个创新方向 (Safest Innovation Directions)**

结合上述分析，针对你的低算力文档主导背景，建议如下：

**方向 1：基于图算法的检索调度 (Retrieval Scheduling)**

- **一句话思路**：不要用LLM去规划多跳路径，而是修改HippoRAG的PageRank算法，加入Query意图权重，让算法自动“流”向答案。
    
- **灵感来源**：HippoRAG + Know3-RAG
    
- **修改阶段**：Retrieval (检索阶段)
    

**方向 2：基于实体的轻量级上下文压缩 (Context Compression)**

- **一句话思路**：先用SlimRAG的方法粗筛，再引入1跳邻居关系进行“软保留”，在Token消耗和召回率之间取得比SlimRAG更好的平衡。
    
- **灵感来源**：SlimRAG + LogicRAG
    
- **修改阶段**：Post-retrieval (后处理阶段)
    

**方向 3：即时构建的临时图索引 (Ad-hoc Indexing)**

- **一句话思路**：不维护全局大图，针对每个Query，利用向量检索到的前50个文档块即时构建一个小型的稀疏图，在此小图上进行推理。
    
- **灵感来源**：LogicRAG + ReGraphRAG
    
- **修改阶段**：Indexing/Retrieval (混合)