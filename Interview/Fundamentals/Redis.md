---
title: Redis
tags:
  - interview
  - prepare
  - answers
  - redis
  - middleware
categories:
  - Interview
date: 2026-04-02
draft: false
---

# Redis

Redis 把数据放在内存中，支持多种数据类型和 TTL，常用于缓存、共享会话、计数、限流、排行榜和任务状态。

![image.png](https://img.simi.host/20260402195755582.png)
![image.png](https://img.simi.host/20260402205002117.png)

## 数据类型与选择

| 类型 | 用途 | 常用命令 |
| --- | --- | --- |
| String | 缓存、计数器、锁；可存二进制数据 | `SET`、`GET`、`INCR` |
| List | 有序且可重复的列表、简单队列 | `RPUSH`、`LPOP`、`LRANGE`、`LTRIM` |
| Hash | 对象的字段和值 | `HSET`、`HGET`、`HINCRBY` |
| Set | 无序去重、交并差集 | `SADD`、`SISMEMBER`、`SINTER` |
| ZSet | 成员唯一，按 score 排序；排行榜、延迟队列 | `ZADD`、`ZRANGE`、`ZINCRBY` |
| Bitmap | 基于 String 的位操作，适合签到等布尔状态 | `SETBIT`、`GETBIT`、`BITCOUNT` |
| HyperLogLog | 近似去重计数，例如 UV | `PFADD`、`PFCOUNT` |
| GEO | 地理位置和距离查询 | `GEOADD`、`GEOSEARCH` |
| Stream | 消息流、消费组、待确认消息管理 | `XADD`、`XREADGROUP`、`XACK` |

Agent 的短期对话缓存可以用 List：按顺序追加，`LRANGE` 读取最近消息，`LTRIM` 控制窗口，再用 TTL 过期。需要按消息 ID 查属性时考虑 Hash；需要消费组、确认和重试管理时考虑 Stream。

![image.png](https://img.simi.host/20260402210439853.png)

### Pub/Sub 与 Stream

Pub/Sub 把消息广播给在线订阅者，不保存消息，离线不能补收，适合即时通知。Stream 保存消息，支持按 ID 读取、消费组和 ACK，适合需要处理进度的消息消费；持久性仍取决于持久化、复制和裁剪配置。

### SDS 与跳表

String 的字符串表示使用 SDS，保存长度和容量，获取长度为 O(1)，能存包含 `\0` 的二进制数据，并通过预留空间减少扩容；整数等值还可能采用其他编码。

跳表在有序链表上增加随机层高的索引。查找时从高层跳跃，快要超过目标时降一层，平均查找、插入和删除复杂度为 O(log N)。例如查找 7，可以先从高层跳到 4，再降到底层经过 5 找到 7，无需从头遍历。

ZSet 的常见较大规模编码使用字典加跳表：字典按成员查分数，跳表支持排序和范围查询；小集合可使用紧凑编码。

## 持久化

| 方式 | 恢复方式 | 主要取舍 |
| --- | --- | --- |
| RDB | 加载某时刻的数据快照 | 文件通常较小、恢复快；可能丢失快照后的变更 |
| AOF | 重放写操作日志，可通过重写压缩 | 丢失窗口取决于 fsync 策略；通常占用更多空间和恢复时间 |

可结合两者使用，具体取决于可接受的数据丢失窗口与恢复时间。

![image.png](https://img.simi.host/20260402214543891.png)

## 过期与内存淘汰

**过期**按 TTL 判断数据是否失效；**淘汰**是在达到 `maxmemory` 时释放空间，两者不是同一件事。

Redis 结合访问时检查的惰性过期，以及后台周期检查的主动过期。不会给每个 key 单独创建定时器，也不保证 TTL 到点就立即释放全部物理内存。

![image.png](https://img.simi.host/20260402225907704.png)

达到内存限制后，行为由淘汰策略决定：

- `noeviction`：拒绝需要分配内存的写命令，读和删除通常仍可执行。
- LRU：偏向淘汰最近较少访问的数据。
- LFU：偏向淘汰访问频率较低的数据。
- Random：随机淘汰。
- `volatile-ttl`：从带过期时间的键中，优先淘汰剩余寿命短的键。

`allkeys-*` 面向所有键，`volatile-*` 只面向设置过期时间的键；LRU、LFU 使用近似策略。即使启用淘汰，若没有合适对象或仍无法释放足够空间，也可能拒绝写入。

![image.png](https://img.simi.host/20260402233829875.png)

## 事务

`MULTI → 命令入队 → EXEC`。**入队期间其他客户端仍能执行命令**；到 `EXEC` 执行队列时，其他客户端命令不会插入其中。Pipeline 只是减少网络往返，本身不提供事务隔离。

`WATCH` 在 `MULTI` 前监视 key；执行 `EXEC` 前，若受监视的键发生修改，事务取消并返回空结果，客户端决定是否重试。

Redis 不支持事务回滚：入队阶段的命令名、参数等错误会导致整个事务拒绝执行；执行阶段某条命令失败，其他命令仍会继续，已经成功的修改不会撤销。参见 [Redis 事务文档](https://redis.io/docs/latest/develop/using-commands/transactions/)。

![image.png](https://img.simi.host/20260402234520484.png)

## 分布式锁

用一条命令原子地设置持有者和过期时间：

```text
SET lock_key request_id NX PX 30000
```

`NX` 表示不存在才写入，`PX` 设置毫秒 TTL，`request_id` 是本次持锁的唯一标识。释放时用 Lua 原子地比较标识并删除，避免误删别人的锁；续期也应检查持有者。

执行时间超过 TTL、进程暂停或主从切换，都可能破坏预期的互斥。严格的一致性需求还要由业务端校验，例如用 fencing token 拒绝过期持有者的写入。参见 [Redis 分布式锁说明](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)。

## 缓存穿透、击穿、雪崩

| 问题 | 原因 | 应对 |
| --- | --- | --- |
| 穿透 | 请求的数据在缓存和数据库中都不存在，持续回源 | 校验参数、短 TTL 缓存空值、布隆过滤器拦截确定不存在的 key |
| 击穿 | 单个热点 key 失效，大量请求同时回源 | 合并回源请求或互斥重建；能接受旧数据时，可用逻辑过期后异步刷新 |
| 雪崩 | 大量 key 同时失效，或缓存服务不可用 | TTL 加随机偏移、提高可用性、限流和降级，必要时增加本地缓存 |

热点数据不设物理过期时间时，也需要更新与清理策略；后台刷新返回旧值的方案，要明确业务能接受多旧的数据。

![image.png](https://img.simi.host/20260403000205394.png)
![image.png](https://img.simi.host/20260403000601000.png)
