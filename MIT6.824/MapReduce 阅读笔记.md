---
title: MapReduce 阅读笔记
tags:
  - MapReduce
  - paper
categories:
  - MIT6.824
date: 2024-12-29T13:32:58+08:00
draft: true
---
### 1. 引言（Introduction）

我们意识到，我们的大部分计算都涉及对输入中的每个逻辑 “记录” 应用 map 操作，以便计算一组中间键 / 值对，然后将 reduce 操作应用于共享同一键的所有值，以便适当地组合派生数据。我们使用具有用户指定 map 和 reduce 操作的函数模型，使我们能够轻松地并行化大型计算，并使用重新执行作为容错的主要机制。

这项工作的主要贡献是一个简单的和强大的接口，可实现自动并行化和大规模计算的分布，结合起来使用此接口的实现大型商用PC集群上的高性能。
### 2. 编程模型（Programming Model）

#### Map 和 Reduce 的定义与功能

- **Map（映射）**：是由用户编写的函数，它接受一个输入键值对，然后对输入数据进行处理，产生一组中间键值对。例如在单词计数的例子中，Map 函数会读取文档内容（值），将文档中的每个单词作为键，“1” 作为值，输出一系列 < 单词，“1”> 这样的中间键值对，表示每个单词出现了一次。其作用是将大规模数据的处理分解为对每个独立数据块（逻辑 “记录”）的操作，为后续的合并处理提供基础数据。

- **Reduce（归约）**：同样由用户编写，它接受一个中间键以及与该键相关联的一组值。Reduce 函数的主要任务是将具有相同键的值进行合并处理，通常是将这些值进行某种计算（如求和、连接等），最终生成可能更小的一组值，一般每个 Reduce 调用产生零个或一个输出值。以单词计数为例，Reduce 函数会接收一个单词（键）和该单词对应的所有计数（值的列表），然后将这些计数相加，得到该单词的总出现次数，输出 <单词，总次数> 这样的键值对。Reduce 操作实现了对中间数据的合并和聚合，从而得到最终想要的结果形式。

Map 和 Reduce 函数共同构成了 MapReduce 编程模型的核心，通过这种分而治之的方式，能够在大规模集群上高效地处理海量数据。

#### 典型使用案例（如单词计数）

大型文档集合中每个单词的出现次数的问题

```
// key: document name  
// value: document contents  
map(String key, String value):  
	for each word w in value:  
		EmitIntermediate(w, "1");  

// key: a word  
// values: a list of counts 迭代器，用于遍历与该单词相关联的所有计数
reduce(String key, Iterator values):   
	int result = 0;  
	for each v in values:  
		result += ParseInt(v);  
	Emit(AsString(result));
```

`map`: 遍历文档内容中的每个单词`w`。对于每个单词，使用`EmitIntermediate(w, "1")`发出一个中间键值对，其中键是单词`w`，值是字符串`"1"`。这表示该单词在当前文档中出现了一次（以简单的计数为 1 来表示每次出现）。

`reduce`: 遍历迭代器`values`中的每个值`v`。对于每个值，将`v`从字符串转换为整数并累加到`result`中。最终`result`将是该单词在所有文档中的总出现次数。

##### 类型（Types）

```
map (k1,v1)          -> list(k2,v2) 
reduce (k2,list(v2)) -> list(v2)
```

键值对的域是指键和值所属的数据类型范围或集合。
- 输入键值对的域（input keys and values domain）： 文档名和文档内容组成的键值对集合
- 中间键值对与输出键值对的域：相同，由键：单词（字符串），值：单词个数（整数）来组成

ps: 至于为什么 `list(k2,v2)` 与 `list(v2)` 不相同是因为在 `reduce` 函数里默认是 `k2` 这个键下的内容

##### 域的作用和意义（Domain）

不同的域有助于清晰地区分 `MapReduce` 处理过程中不同阶段的数据类型和结构，使得程序能够正确地处理数据在各个阶段的转换和操作。
用户在编写 `Map` 和 `Reduce` 函数时，需要根据这些域的定义来正确处理数据类型的转换（因为 C++ 实现传递的是字符串，用户代码要负责在字符串和实际合适的数据类型之间转换），以确保整个 `MapReduce` 作业能够准确地计算和生成期望的结果。
例如，在 Map 函数中，要将输入的字符串类型的文档内容正确解析为单词等合适的数据类型，然后以符合中间键值对域要求的格式输出中间结果；在 Reduce 函数中，要正确处理来自相同域的中间键值对数据，最终生成符合输出键值对域要求的结果。

### 3. 实现细节（Implementation）

#### 系统架构与流程概览

![image.png](https://img.simi.host/20241229162643.png)
Figure 1: Execution overview

这张图展示了一个 MapReduce 计算模型的工作流程。MapReduce 是一种用于处理大规模数据集的编程模型，它通过将任务分解成多个子任务，并在集群中的多个节点上并行执行，最后将结果合并起来。以下是对图中各个部分的详细解释：

1. **User Program（用户程序）**：
    
    - 位于图的顶部，是整个流程的起点。用户程序启动并控制整个 MapReduce 作业。
    - 用户程序通过`fork`操作创建一个`Master`进程和多个`worker`进程。

2. **Master（主进程）**：

    - Master 负责将输入数据分成多个`split`，并将`map`和`reduce`任务分配给各个`worker`。

     **主节点的信息传递角色**：
     
	- 在`MapReduce`计算中，存在大量的中间数据。当`Map`任务处理完输入数据的一个分片后，会产生中间结果并存储为中间文件。这些中间文件可能分布在不同的节点上，而主节点就像是一个信息枢纽（conduit）。
	- 它负责将这些中间文件的位置信息（例如在哪个节点的哪个磁盘路径下）从完成 `Map` 任务的节点传递到需要这些数据的 `Reduce` 任务所在的节点。这是因为 `Reduce` 任务需要知道从哪里获取与自己相关的中间数据来进行进一步处理。

     **主节点对Map任务信息的存储**： 
     
	- 对于每个完成的 `Map` 任务，主节点会记录该任务产生的中间文件区域的相关信息。这里的“R个中间文件区域”表示根据用户指定的 `Reduce` 任务数量（R）， `Map` 任务会将中间数据分成R个部分（分区）存储。例如，如果R = 5，那么Map任务可能会将中间数据分成5个区域存储，每个区域对应一个 `Reduce` 任务可能需要处理的数据。
	- 主节点存储这些区域的位置（如节点IP、磁盘路径等）和大小信息。这有助于主节点有效地管理和协调数据的传输，以及在 `Reduce` 任务需要数据时能够准确地提供信息。

     **信息更新与推送机制**： 
     
	- 随着 `Map` 任务的逐步完成，主节点会不断收到关于新完成的 `Map` 任务的中间文件位置和大小的更新信息。这些更新是实时的，以便主节点能够及时掌握数据的分布情况。
	- 一旦主节点获取到这些更新信息，它会将相关的中间文件位置信息推送给正在进行 `Reduce` 任务的工作节点。这种推送是增量式的（incrementally），即只推送与当前正在进行的 `Reduce` 任务相关的新完成的 `Map` 任务的信息，避免不必要的数据传输和节点资源浪费。这样， `Reduce` 任务所在的工作节点就能够准确地知道从哪里获取所需的中间数据，从而顺利进行后续的处理操作，最终实现整个 `MapReduce` 计算的高效执行。

3. **Worker（工作进程）**：
    
    - 图中有多个`worker`进程，分布在图的中间和底部。
    - `worker`进程负责执行`map`和`reduce`任务。

4. **Input Files（输入文件）**：
    
    - 位于图的左下角，代表原始输入数据。
    - 输入数据被分成多个`split`（数据分片），如`split 0`、`split 1`等。

5. **Map Phase（映射阶段）**：
    
    - 每个`worker`读取一个`split`（通过`read`操作），然后执行`map`任务。
    - `map`任务的结果以中间文件（`Intermediate files`）的形式存储在本地磁盘上。

6. **Intermediate Files（中间文件）**：
    
    - 位于图的中间偏右位置，代表`map`阶段的输出。
    - 这些中间文件存储在本地磁盘上，供`reduce`阶段使用。

7. **Reduce Phase（归约阶段）**：
    
    - `worker`进程从本地磁盘上读取中间文件（通过`remote read`操作），然后执行`reduce`任务。
    - `reduce`任务的结果被写入`Output files`。

8. **Output Files（输出文件）**：
    
    - 位于图的右下角，代表最终的输出结果。
    - 这些文件是`reduce`阶段的输出，包含了最终的计算结果。

成功完成后，MapReduce 执行的输出可在 R 输出文件中获取（每个归约任务一个文件，文件名由用户指定）。通常，用户不需要将这些 R 输出文件合并为一个文件——他们经常将这些文件作为另一个 MapReduce 调用的输入，或者在另一个能够处理被划分到多个文件中的输入的分布式应用程序中使用它们。

整个流程通过`worker`进程之间的协作和数据交换，实现了大规模数据的并行处理和计算。`Master`进程负责协调和分配任务，确保整个作业的顺利进行。

##### Master 和 Worker 的角色与任务分配

`Master`: 

There are M map tasks and R reduce tasks to assign. The master picks idle workers and assigns each one a map task or a reduce task.
有 M map 任务和 R reduce 任务要分配。master 选择空闲的 worker 并为每个 worker 分配一个 map 任务或一个 reduce 任务。

`Worker`:  

A worker who is assigned a map task reads the contents of the corresponding input split. It parses key/value pairs out of the input data and passes each pair to the user-defined $Map$ function. The intermediate key/value pairs produced by the Map function are buffered in memory.
被分配了映射（map）任务的工作进程（worker）读取相应输入分片（input split）的内容。它从输入数据中解析出键/值对，并将每一对传递给用户定义的映射函数（$Map$ function）。由映射函数生成的中间键/值对被缓存在内存中。

The reduce worker iterates over the sorted intermediate data and for each unique intermediate key encountered, it passes the key and the corresponding set of intermediate values to the user’s Reduce function. The output of the Reduce function is appended to a final output file for this reduce partition.
执行归约（reduce）任务的工作进程（worker）会遍历已排序的中间数据，对于遇到的每个唯一的中间键（intermediate key），它会将该键以及相应的一组中间值传递给用户的归约函数（Reduce function）。归约函数的输出会被追加到这个归约分区的最终输出文件中。

#### 容错机制（Fault Tolerance）

Since the MapReduce library is designed to help process very large amounts of data using hundreds or thousands of machines, the library must tolerate machine failures gracefully.

##### 工作线程故障（Worker Failure）

`Master` 会定期 `ping` 每个 `worker`。如果在一段时间内未收到 `worker` 的响应，则 `master` 会将该 `worker` 标记为失败。`worker` 完成的任何 `map` 任务都将重置回其初始空闲状态，因此有资格在其他 `worker` 上进行调度。同样，失败的工作程序上正在进行的任何 `map` 任务或 `reduce` 任务也会重置为 `idle` (空闲)，并有资格重新安排。

**已完成 `reduce` 任务**

已完成的映射任务在失败时重新执行，因为其输出存储在失败计算机的本地磁盘上，因此无法访问。已完成的 `reduce` 任务不需要重新执行，因为它们的输出存储在全局文件系统中。

**未完成 `reduce` 任务**

当执行 `map` 任务的 `Worker A` 失败时，该任务由 `Worker B` 执行。正在执行的包含 `map` 的 `reduce` 程序会收到 `map` 任务重新执行的通知（强调的是 `Reduce` 任务获取数据来源的调整，`即map` 任务输出的中间数据的存储位置的改变）。

##### 主站故障（Master Failure）

很容易让主节点定期写入上述主数据结构的检查点。如果主节点任务失败，可以从最后一个检查点状态启动一个新副本。然而，鉴于只有一个主节点，其出现故障的可能性不大；因此，我们当前的实现是，如果主节点出现故障，则中止 MapReduce 计算。客户端可以检查这种情况，如果需要，可以重试 MapReduce 操作。

##### 故障存在时的语义（Semantics in the Presence of Failures）

###### 原子提交机制概述

为了确保在分布式环境下 `MapReduce` 计算结果的正确性和一致性，即使存在故障也能得到与无故障顺序执行相同的输出，系统依赖于对 `Map` 和 `Reduce` 任务输出的原子提交（atomic commits）机制。

###### 任务输出写入临时文件

**Map 任务**：在执行过程中，每个正在进行的 `Map` 任务会将其产生的中间结果输出写入 R 个私人临时文件（private temporary files）。这里的 R 是由用户指定的 `Reduce` 任务数量。这意味着 `Map` 任务会根据后续 `Reduce` 任务的数量对其输出进行分区，每个分区对应一个 `Reduce` 任务。例如，如果有 5 个 `Reduce` 任务（R = 5），那么一个 `Map` 任务会产生 5 个临时文件，分别用于存储与这 5 个 `Reduce` 任务相关的中间数据。这样做的目的是为了在后续的 `Reduce` 阶段，能够方便地将相同键的数据发送到对应的 Reduce `任务进行处理`。

**Reduce 任务**：`Reduce` 任务则产生一个临时文件来存储其计算结果。这个临时文件在 `Reduce` 任务执行过程中用于暂存中间或最终的计算结果，等待合适的时候转换为最终输出文件。

###### Map 任务完成后的通信与记录

**消息发送**：当一个 `Map` 任务完成时，执行该任务的工作节点（worker）会向主节点（master）发送一个消息。这个消息中包含了该 `Map` 任务所产生的 R 个临时文件的名称。这使得主节点能够知道这些临时文件的位置信息，以便在后续的 `Reduce` 任务执行过程中，将正确的中间数据提供给相应的 `Reduce` 任务。

**主节点处理**：主节点收到消息后，会检查该 `Map` 任务是否已经完成过（可能由于网络延迟等原因收到重复消息）。如果是已经完成的 `Map` 任务，主节点会忽略该消息；否则，主节点会将这 R 个文件的名称*记录在其内部的数据结构中*。这个数据结构用于跟踪和管理 `Map` 任务的输出位置信息，以便在 `Reduce` 任务需要时能够准确地获取数据。

###### 归约任务完成时的操作

当一个归约（reduce）任务完成时，执行归约任务的工作节点（reduce worker）会以原子操作的方式将其临时输出文件重命名为最终输出文件。如果同一个归约任务在多台机器上执行（例如，由于节点故障等原因，导致该任务在不同机器上重试），那么对于同一个最终输出文件会执行多次重命名操作。我们依赖底层文件系统提供的原子重命名操作来确保最终的文件系统状态中只包含由一次归约任务执行所产生的数据。

###### 较弱语意？

~~并不是很清楚，下次再来看看~~

#### 本地性优化（Data Locality）

在计算环境中网络带宽稀缺，为节省带宽，利用由 `GFS` 管理、存储于集群机器本地磁盘的输入数据这一特性。 `GFS` 将文件分成64MB块，每块通常存3个副本于不同机器。 `MapReduce` 主节点考虑输入文件位置，优先将映射任务调度到含对应数据副本的机器，不行则调度到数据副本附近机器。在集群大量工作节点运行大型 `MapReduce` 操作时，多数输入数据可本地读取，不消耗网络带宽 。

#### 任务粒度与动态负载平衡



### 4. 优化与扩展（Refinements）

- 分区函数与排序保证
- Combiner 的应用场景
- 输入输出类型与侧写效果
- 跳过错误记录与本地调试支持

### 5. 性能评估（Performance Evaluation）

- 测试环境描述
- 性能评估案例（如 grep 和排序）
- 对比与性能瓶颈分析
- 备份任务和故障处理对性能的影响

### 6. 应用与经验（Applications and Experience）

- 在 Google 内部的实际应用（如索引构建、数据挖掘等）
- MapReduce 的优势和成功因素
- 使用统计和开发历史

### 7. 相关工作（Related Work）

- 相关编程模型（如 Bulk Synchronous Programming、MPI）
- 比较与创新点

### 8. 总结（Conclusions）

- MapReduce 的主要特点与意义
- 对分布式计算的启发和贡献

### 9. 思考与启示（Personal Reflections）

- 对 MapReduce 编程模型的理解与感想
- 与现有技术的对比
- 对未来研究的启发与可能改进方向

### 10. 附录（Appendix，视需要）

- 重要图表或示例代码的记录
- 参考资料与延伸阅读


