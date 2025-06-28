---
title: go 设计哲学
tags:
  - learn
categories:
  - Go
date: 2025-06-20T15:46:26+08:00
draft: false
---
## Go 的一些理解

### 如何解决循环依赖（Circular Dependency）

#### 什么是循环依赖

- `package a` 导入了 `package b`
- `package b` 又反过来导入了 `package a`

```txt
  a.go           b.go
+--------+     +--------+
| package| --> | package|
|   a    |     |   b    |
|        | <-- |        |
+--------+     +--------+
```

依赖循环是设计的问题，如果遇到依赖的情况，需要重新思考该如何对项目进行设计。

#### 解决循环依赖

核心思想是 **打破循环**。Go 社区推崇的最佳实践是利用 **接口（Interface）** 和 **依赖倒置原则（Dependency Inversion Principle, DIP）**。

##### 方案一：使用接口（最推荐、最优雅的 "Go Way"）

依赖倒置原则的核心是 **“依赖于抽象，而不是依赖于具体实现”**。在 Go 中，这个“抽象”就是接口。

##### 方案二：提取公共依赖到新包

如果循环仅仅是因为共享了某个数据结构（struct），那么最简单的办法就是把这个公共的数据结构提取到一个新的、更底层的包里。

**警告**：不要滥用这个模式，避免创建一个什么都往里扔的“垃圾桶”(`common`, `utils`)包。这个新包应该只包含稳定、底层、被广泛依赖的数据结构或常量。

Pixiu 里不是什么东西都能放进 `model` 和 `common` 里的，这点需要注意，希望最后不用重构。

##### 方案三：使用回调函数

对于一些简单的依赖，使用回调函数是接口的一个轻量级替代方案。

**场景**：`user` 包中的一个函数需要 `order` 包的某个功能，但整体上 `user` 包并不想依赖 `order` 包。

事实上，回调函数即是依赖注入的函数。

#### 依赖注入（Dependency Injection, DI）解析

依赖注入的核心思想就是：一个组件（对象/结构体）**不应该**自己创建它所需要的依赖（其他组件），而**应该**由外部的、更高层次的组件来提供（“注入”）给它。

这种控制关系的反转（组件从主动创建依赖，变为被动接收依赖），也称为“**控制反转**”（Inversion of Control, IoC）。DI 是实现 IoC 的一种最常见的技术。

##### Go interface DI 中的`标准`

接口定义了**行为契约**：它只规定一个组件**应该能做什么**（有哪些方法），但不关心**具体是怎么做的**。

**隐式实现**：这是 Go 接口的精髓。任何类型，只要它实现了接口中定义的所有方法，就被认为自动满足了这个接口，无需使用 `implements` 这样的关键字。

##### sample

一个**计费服务 (`BillingService`)**，当用户支付账单后，需要发送一个**通知**。

我们希望这个“通知”方式是可替换的，今天用邮件，明天可能想换成短信，测试的时候可能只想打印到控制台。

###### 第 1 步：在“消费者”中定义接口（定义插槽标准）

`BillingService` 是依赖的消费者，因为它需要一个“通知器”的功能。所以，我们应该在 `billing` 包中定义这个接口。

**原则：接口应该由消费者来定义（Define interfaces where they are used）。**

`services/billing/billing.go`


```go
package billing

import "fmt"

// 1. 定义一个“通知器”接口，这是我们的“插槽标准”
// BillingService 不关心具体怎么发通知，它只需要一个能 Notify 的东西。
type Notifier interface {
	Notify(userID int, message string) error
}

// 2. BillingService 结构体，它包含一个接口类型的字段
type Service struct {
	notifier Notifier // 依赖的是抽象的接口，而不是具体的实现
}

// 3. 构造函数，接收一个满足 Notifier 接口的实例，并“注入”进来
func NewService(n Notifier) *Service {
	return &Service{
		notifier: n,
	}
}

// PayInvoice 是核心业务逻辑
func (s *Service) PayInvoice(userID int, amount float64) error {
	// ... 一些计费逻辑 ...
	fmt.Printf("Processing invoice for user %d, amount %.2f\n", userID, amount)

	// 4. 使用依赖（调用接口方法），它不知道具体是哪个实现在工作
	message := fmt.Sprintf("Your invoice for $%.2f has been paid.", amount)
	err := s.notifier.Notify(userID, message)
	if err != nil {
		return fmt.Errorf("failed to send notification: %w", err)
	}

	fmt.Println("Billing process completed successfully.")
	return nil
}
```

###### 第 2 步：创建具体的实现（制造能插进插槽的零件）

现在，我们来创建几个不同的“通知器”，它们都符合 `Notifier` 接口标准。

`notifiers/email.go`

```go
package notifiers

import "fmt"

// EmailNotifier 是一个具体的实现
type EmailNotifier struct {
	// 可以有自己的字段，比如 SMTP 服务器地址等
	AdminEmail string
}

// 实现 Notifier 接口的 Notify 方法
func (e EmailNotifier) Notify(userID int, message string) error {
	// 实际的邮件发送逻辑
	fmt.Printf("--- Sending EMAIL to user %d ---\n", userID)
	fmt.Printf("Message: %s\n", message)
	fmt.Printf("Admin copy sent to: %s\n", e.AdminEmail)
	fmt.Println("------------------------------")
	return nil
}
```

`notifiers/sms.go`

```go
package notifiers

import "fmt"

// SMSNotifier 是另一个具体的实现
type SMSNotifier struct {
	APIToken string // 短信服务商的 token
}

// 同样实现 Notifier 接口的 Notify 方法
func (s SMSNotifier) Notify(userID int, message string) error {
	// 实际的短信发送逻辑
	fmt.Printf("--- Sending SMS to user %d ---\n", userID)
	fmt.Printf("Message: %s (Token: %s)\n", message, s.APIToken)
	fmt.Println("----------------------------")
	return nil
}
```

注意：`EmailNotifier` 和 `SMSNotifier` 都不需要知道 `billing` 包的存在。它们只是默默地实现了自己的 `Notify` 方法。

###### 第 3 步：在 `main.go` 中进行组装和注入（把零件插到主板上）

`main.go` 是我们程序的最高层。它负责创建具体的依赖实例，并将其注入到消费者中。

`main.go`

```go
package main

import (
	"project/services/billing"
	"project/notifiers"
	"log"
)

func main() {
	// === 场景一：使用邮件通知 ===
	fmt.Println("### Running with Email Notifier ###")
	
	// 1. 创建一个具体的依赖实例 (邮件通知器)
	emailNotifier := notifiers.EmailNotifier{AdminEmail: "admin@example.com"}

	// 2. 将依赖实例注入到 BillingService 的构造函数中
	//    因为 EmailNotifier 实现了 Notify(...) 方法，所以它满足 billing.Notifier 接口，可以被传入
	billingSvc1 := billing.NewService(emailNotifier)

	// 3. 调用业务方法
	if err := billingSvc1.PayInvoice(101, 99.95); err != nil {
		log.Fatal(err)
	}

	fmt.Println("\n=====================================\n")

	// === 场景二：切换到短信通知 ===
	fmt.Println("### Running with SMS Notifier ###")

	// 1. 创建另一个具体的依赖实例 (短信通知器)
	smsNotifier := notifiers.SMSNotifier{APIToken: "abcdef123456"}

	// 2. 将这个新的依赖实例注入
	//    注意：我们只是改变了传入的零件，billing.NewService 和 billingSvc 本身的代码完全不用动！
	billingSvc2 := billing.NewService(smsNotifier)

	// 3. 再次调用业务方法，行为已经改变
	if err := billingSvc2.PayInvoice(202, 49.50); err != nil {
		log.Fatal(err)
	}
}
```