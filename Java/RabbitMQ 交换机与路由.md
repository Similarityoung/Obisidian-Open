---
title: RabbitMQ 交换机与路由
tags:
  - java
categories:
  - Java
date: 2024-10-31T18:31:07+08:00
draft: true
---

# RabbitMQ 交换机与路由

## 消息经过哪里

生产者把消息交给 Exchange，Exchange 根据类型和绑定规则路由到 Queue，消费者从 Queue 接收消息。

![消息流向](https://netfilx.github.io/spring-boot/8.springboot-rabbitmq/1.png)

- **Virtual host**：隔离交换机、队列和绑定等资源；访问权限还可以细化到资源。
- **Exchange**：负责路由，不负责存储消息。
- **Queue**：保存等待消费的消息。
- **Binding**：连接 Exchange 与 Queue，定义匹配条件。

## 四种交换机

| 类型 | 匹配方式 |
| --- | --- |
| Direct | Routing key 与 Binding key 精确匹配 |
| Topic | 按点分隔的词和通配符匹配 |
| Fanout | 转发到所有绑定队列 |
| Headers | 根据消息头匹配 |

默认交换机是名字为空字符串的 Direct Exchange，它会自动按队列名绑定。

## Direct 示例

![Direct 路由示例](https://netfilx.github.io/spring-boot/8.springboot-rabbitmq/2.png)

Q1 绑定 `orange`；Q2 绑定 `black` 和 `green`。Routing key 匹配哪个绑定，消息就进入对应队列；一个队列可以有多个绑定。

## Topic 示例

Routing key 使用点分隔单词，例如 `agreements.eu.stockholm`。

- `*` 匹配恰好一个单词。
- `#` 匹配零个或多个单词。
- 绑定键不必包含通配符；没有通配符时按完整键匹配。

例如 `agreements.*.stockholm` 匹配地区部分的一个词；`agreements.eu.#` 匹配 `agreements.eu` 及其后续层级。

Spring AMQP 发送示例：三个参数依次是交换机、Routing key 和消息。消费者使用的队列还需要按相应规则绑定到交换机。

```Java
rabbitTemplate.convertAndSend("testTopicExchange","key1.a.c.key2", " this is  RabbitMQ!");
```

消息无法路由时，处理方式取决于 `mandatory`、备用交换机等配置，不能与消费确认 ACK 混为一谈。

参考：[RabbitMQ Topic 教程](https://www.rabbitmq.com/tutorials/tutorial-five-java)。
