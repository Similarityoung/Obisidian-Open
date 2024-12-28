---
title: java 集成 rabbitmq
tags:
  - java
categories:
  - Back
date: 2024-10-31T18:31:07+08:00
draft: true
---

通常我们谈到队列服务, 会有三个概念： 发消息者、队列、收消息者，RabbitMQ 在这个基本概念之上, 多做了一层抽象, 在发消息者和 队列之间, 加入了交换器 (Exchange). 这样发消息者和队列就没有直接联系, 转而变成发消息者把消息给交换器, 交换器根据调度策略再把消息再给队列。

![img](https://netfilx.github.io/spring-boot/8.springboot-rabbitmq/1.png)

- 左侧 P 代表 生产者，也就是往 RabbitMQ 发消息的程序。
- 中间即是 RabbitMQ，==其中包括了 交换机 和 队列。==
- 右侧 C 代表 消费者，也就是往 RabbitMQ 拿消息的程序。

那么，_其中比较重要的概念有 4 个，分别为：虚拟主机，交换机，队列，和绑定。_

- - 虚拟主机：一个虚拟主机持有一组交换机、队列和绑定。为什么需要多个虚拟主机呢？很简单，RabbitMQ当中，_用户只能在虚拟主机的粒度进行权限控制。_ 因此，如果需要禁止A组访问B组的交换机/队列/绑定，必须为A和B分别创建一个虚拟主机。每一个RabbitMQ服务器都有一个默认的虚拟主机“/”。
    - 交换机：_Exchange 用于转发消息，但是它不会做存储_ ，如果没有 Queue bind 到 Exchange 的话，它会直接丢弃掉 Producer 发送过来的消息。 这里有一个比较重要的概念：路由键 。消息到交换机的时候，交互机会转发到对应的队列中，那么究竟转发到哪个队列，就要根据该路由键。
    - 绑定：也就是交换机需要和队列相绑定，这其中如上图所示，是多对多的关系。
- **交换机(Exchange)**

交换机的功能主要是接收消息并且转发到绑定的队列，交换机不存储消息，在启用ack模式后，交换机找不到队列会返回错误。交换机有四种类型：Direct, topic, Headers and Fanout

- - Direct：direct 类型的行为是”先匹配, 再投送”. 即在绑定时设定一个 **routing_key**, 消息的 **routing_key** 匹配时, 才会被交换器投送到绑定的队列中去.
    - Topic：按规则转发消息（最灵活）
    - Headers：设置header attribute参数类型的交换机
    - Fanout：转发消息到所有绑定队列
- **Direct Exchange**

Direct Exchange是RabbitMQ默认的交换机模式，也是最简单的模式，根据key全文匹配去寻找队列。

![img](https://netfilx.github.io/spring-boot/8.springboot-rabbitmq/2.png)

第一个 X - Q1 就有一个 binding key，名字为 orange； X - Q2 就有 2 个 binding key，名字为 black 和 green。_当消息中的 路由键 和 这个 binding key 对应上的时候，那么就知道了该消息去到哪一个队列中。_

Ps：为什么 X 到 Q2 要有 black，green，2个 binding key呢，一个不就行了吗？ - 这个主要是因为可能又有 Q3，而Q3只接受 black 的信息，而Q2不仅接受black 的信息，还接受 green 的信息。

- **Topic Exchange**

_Topic Exchange 转发消息主要是根据通配符。_ 在这种交换机下，队列和交换机的绑定会定义一种路由模式，那么，通配符就要在这种路由模式和路由键之间匹配后交换机才能转发消息。

在这种交换机模式下：

- - 路由键必须是一串字符，用句号（.） 隔开，比如说 agreements.us，或者 agreements.eu.stockholm 等。
    - 路由模式必须包含一个 星号（* )，主要用于匹配路由键指定位置的一个单词，比如说，一个路由模式是这样子：agreements..b.*，那么就只能匹配路由键是这样子的：第一个单词是 agreements，第四个单词是 b。 井号（#）就表示相当于一个或者多个单词，例如一个匹配模式是agreements.eu.berlin.#，那么，以agreements.eu.berlin开头的路由键都是可以的。

具体代码发送的时候还是一样，第一个参数表示交换机，第二个参数表示routing key，第三个参数即消息。如下：

```Java
rabbitTemplate.convertAndSend("testTopicExchange","key1.a.c.key2", " this is  RabbitMQ!");
```

接收者需要进行队列的绑定