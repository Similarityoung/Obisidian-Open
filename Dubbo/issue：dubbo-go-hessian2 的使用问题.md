---
title: 
tags:
  - issue
categories:
  - Dubbo
date: 2025-04-03T21:17:51+08:00
draft: false
---
### [issue 关联](https://github.com/apache/dubbo-go/issues/2728)

#### Environment

- Server: Java-server, dubbo version v3.0.14
- Client: Dubbo-go, v3.1.1
- Protocol: Dubbo
- Registry: Nacos, v2.1.2

#### Problem

dubbo-go 的 client 端无法调用 dubbo 的 server 端的代码。

### 问题分析

在调试并复现代码问题后，我发现问题出在 `QueryDataSource` 方法中：

```go
QueryDataSource func(ctx context.Context, id int) (*DataSource, error) dubbo:"queryDataSource"
```

根本原因是类型不匹配：在 Go 中，`int` 和 `int64` 通常都是 8 字节，而在 Java 中，`int` 类型只有 4 字节。 这种差异导致 Java 无法正确识别要调用的方法。

**解决方案：** 将 Go 方法中的 `int` 参数更改为 `int32`。

```go
QueryDataSource func(ctx context.Context, id int32) (*DataSource, error) dubbo:"queryDataSource"
```

这个修改应该能解决类型兼容性问题。

**Go 中的枚举表示**

我注意到您定义的 Java 枚举类型在 Go 中表示为字符串：

```go
Type string hessian:"type" // Mapped from Java enum
```

为了解决这个问题并确保在 Go 中正确处理枚举，我建议使用 `dubbo-go-hessian2` 仓库中提供的枚举生成工具。

您可以在这里找到该工具和说明：[dubbo-go-hessian2 枚举生成工具](https://github.com/apache/dubbo-go-hessian2/blob/master/tools/gen-go-enum/README.md)

使用此工具将使您能够在 Go 代码中正确表示和使用枚举。 这将提高类型安全性和代码清晰度。

### 总结

#### 类型错误

在 Java 中，`int` 类型始终为 4 字节（32 位），而在 Go 中，`int` 类型的大小取决于底层平台。在 64 位架构上，`int` 通常为 8 字节（64 位），而在 32 位架构上则为 4 字节（32 位）。Go 官方文档指出，`int` 是一种带符号的整数类型，其大小至少为 32 位。

下表总结了 Go 中不同整数类型的大小：

```txt
int类型的大小为 8 字节 (64位系统) / 4 字节 (32位系统)

int8类型大小为 1 字节 (8 位)

int16类型大小为 2 字节 (16 位)

int32类型大小为 4 字节 (32 位)

int64类型大小为 8 字节 (64 位)
```

需要注意的是，`uint` 类型（以及 `uint8` 等无符号整数类型）的大小也取决于底层 CPU 架构。在 64 位 CPU 上，`uint` 为 8 字节，在 32 位 CPU 上则为 4 字节。

为了避免因 `int` 类型大小不一致导致的序列化问题，建议在跨语言通信时，显式使用固定大小的整数类型，例如 `int32`。这样可以确保 Go 和 Java 之间数据类型的兼容性，从而避免类型错误。

Go 的 `int` 类型是平台相关的，而 Java 的 `int` 类型是固定的。在进行跨语言序列化时，必须注意这种差异，并采取适当的措施来确保类型匹配，推荐使用 `int32` 这种明确声明字节大小的类型。

#### go 中实现枚举类

阅读 [A tool for generate hessian2 java enum define golang code](https://github.com/apache/dubbo-go-hessian2/blob/master/tools/gen-go-enum/README.md)

生成的代码文件为

```go
package enum

import (
	"strconv"
)

import (
	hessian "github.com/apache/dubbo-go-hessian2"
)

const (
	TestColorEnumRed TestColorEnum = iota
	TestColorEnumBlue
	TestColorEnumYellow
)

var _TestColorEnumValues = map[TestColorEnum]string{
	TestColorEnumRed: "RED",
	TestColorEnumBlue: "BLUE",
	TestColorEnumYellow: "YELLOW",
}

var _TestColorEnumEntities = map[string]TestColorEnum{
	"RED": TestColorEnumRed,
	"BLUE": TestColorEnumBlue,
	"YELLOW": TestColorEnumYellow,
}

type TestColorEnum hessian.JavaEnum

func (e TestColorEnum) JavaClassName() string {
	return "com.test.enums.TestColorEnum"
}

func (e TestColorEnum) String() string {
	if v, ok := _TestColorEnumValues[e]; ok {
		return v
	}

	return strconv.Itoa(int(e))
}

func (e TestColorEnum) EnumValue(s string) hessian.JavaEnum {
	if v, ok := _TestColorEnumEntities[s]; ok {
		return hessian.JavaEnum(v)
	}

	return hessian.InvalidJavaEnum
}

func NewTestColorEnum(s string) TestColorEnum {
	if v, ok := _TestColorEnumEntities[s]; ok {
		return v
	}

	return TestColorEnum(hessian.InvalidJavaEnum)
}

func init() {
	for v := range _TestColorEnumValues {
		hessian.RegisterJavaEnum(v)
	}
}
```

这段代码旨在解决 Go 与 Java 之间枚举类型不兼容的问题，特别是在使用 Dubbo 和 Hessian 协议进行跨语言通信时。它通过在 Go 中模拟 Java 枚举的行为，确保序列化和反序列化过程中的类型一致性。

**代码拆解与原理分析：**

1.  **类型定义和常量声明：**

```go
package enum

import (
	"strconv"
)

import (
  	hessian "github.com/apache/dubbo-go-hessian2"
)

const (
	TestColorEnumRed TestColorEnum = iota
	TestColorEnumBlue
	TestColorEnumYellow
)

type TestColorEnum hessian.JavaEnum
```

*   `package enum`:  定义包名为 `enum`，表示这些枚举类型相关的代码。
*   `import`: 导入必要的包，`strconv` 用于字符串转换，`hessian` 是 Dubbo Go Hessian2 协议的库。
*   `const`: 定义了三个枚举常量：`TestColorEnumRed`、`TestColorEnumBlue`、`TestColorEnumYellow`。  `iota` 是一个特殊的常量生成器，每次使用都会自增，所以它们的值依次为 0, 1, 2。  这实际上是在 Go 中创建了一组整型常量，每个常量代表一个枚举值。
*   `type TestColorEnum hessian.JavaEnum`:  定义了 `TestColorEnum` 类型，它底层基于 `hessian.JavaEnum` 类型。 `hessian.JavaEnum` 是 Dubbo Go Hessian2 库中定义的一个接口，用于标识一个类型是 Java 枚举类型，并参与到 Hessian 的序列化/反序列化过程中。 关键点在于，虽然在 Go 中使用了整型常量，但通过 `hessian.JavaEnum` 接口，Hessian 能够将它们识别为 Java 枚举类型。

2.  **枚举值与字符串的双向映射：**

 ```go
var _TestColorEnumValues = map[TestColorEnum]string{
	TestColorEnumRed: "RED",
	TestColorEnumBlue: "BLUE",
	TestColorEnumYellow: "YELLOW",
}

var _TestColorEnumEntities = map[string]TestColorEnum{
 	"RED": TestColorEnumRed,
	"BLUE": TestColorEnumBlue,
	"YELLOW": TestColorEnumYellow,
}
 ```

*   `_TestColorEnumValues`:  一个从 `TestColorEnum` (整型) 到 Java 枚举字符串名称的映射。  这用于将 Go 中的枚举值转换为 Java 中对应的枚举名称，例如将 `TestColorEnumRed` (0) 转换为 "RED"。
*   `_TestColorEnumEntities`:  一个从 Java 枚举字符串名称到 `TestColorEnum` (整型) 的映射。  这用于将 Java 中传递过来的枚举名称转换为 Go 中对应的枚举值，例如将 "RED" 转换为 `TestColorEnumRed` (0)。

这两个映射是实现双向转换的关键，确保 Go 和 Java 之间枚举值的对应关系。  使用 `_` 开头表示这些变量是包私有的，不希望在包外部直接访问。

3.  **`JavaClassName()` 方法：**

```go
func (e TestColorEnum) JavaClassName() string {
	return "com.test.enums.TestColorEnum"
}
```

*   `JavaClassName()`:  这个方法实现了 `hessian.JavaEnum` 接口。  它返回 Java 枚举类的完整类名（包括包名）。 Hessian 协议需要这个信息来正确地序列化和反序列化 Java 枚举。  这个方法是 Hessian 识别 Java 枚举的关键。

4.  **`String()` 方法：**

```go
func (e TestColorEnum) String() string {
	if v, ok := _TestColorEnumValues[e]; ok {
	    return v
    }

	return strconv.Itoa(int(e))
}
```

*   `String()`:  实现了 `Stringer` 接口 (Go 标准库中的 `fmt.Stringer` 接口)。  这个方法用于将 `TestColorEnum` 类型转换为字符串。
*   它首先尝试在 `_TestColorEnumValues` 映射中查找对应的字符串名称。如果找到，则返回该名称（例如，`TestColorEnumRed` 返回 "RED"）。
*   如果找不到（这种情况通常不应该发生，除非枚举值是无效的），则使用 `strconv.Itoa()` 将枚举值转换为字符串形式的整数 (例如，0, 1, 2)。  这提供了一个备选方案，但建议确保所有有效的枚举值都在映射中。

这个方法的主要目的是提供一个友好的字符串表示形式，方便调试和日志输出。

5.  **`EnumValue()` 方法：**

```go
func (e TestColorEnum) EnumValue(s string) hessian.JavaEnum {
	if v, ok := _TestColorEnumEntities[s]; ok {
		return hessian.JavaEnum(v)
	}

	return hessian.InvalidJavaEnum
}
```

*   `EnumValue()`:  这个方法用于将 Java 中传递过来的枚举名称 (字符串) 转换为 Go 中的 `TestColorEnum` 类型。
*   它首先在 `_TestColorEnumEntities` 映射中查找对应的 `TestColorEnum` 值。如果找到，则将该值转换为 `hessian.JavaEnum` 类型并返回。
*   如果找不到，则返回 `hessian.InvalidJavaEnum`，表示这是一个无效的枚举值。

这个方法是反序列化 Java 枚举的关键。  Hessian 会调用这个方法将 Java 端的枚举字符串转换为 Go 端的枚举值。

6.  **`NewTestColorEnum()` 方法：**

```go
func NewTestColorEnum(s string) TestColorEnum {
	if v, ok := _TestColorEnumEntities[s]; ok {
		return v
	}

	return TestColorEnum(hessian.InvalidJavaEnum)
}
```

*   `NewTestColorEnum()`:  这个方法提供了一个更方便的方式来创建一个 `TestColorEnum` 类型的实例，基于 Java 的枚举名称。
*   它的逻辑与 `EnumValue()` 类似，但在找不到对应枚举值时，会返回一个 `TestColorEnum` 类型的零值，其底层是 `hessian.InvalidJavaEnum`。

`EnumValue()` 和 `NewTestColorEnum()` 的区别在于返回值类型：`EnumValue()` 返回 `hessian.JavaEnum` 接口类型，而 `NewTestColorEnum()` 返回具体的 `TestColorEnum` 类型。  选择哪个方法取决于具体的使用场景。  在 Hessian 反序列化过程中，通常会使用 `EnumValue()`。

7.  **`init()` 函数：**

```go
func init() {
	for v := range _TestColorEnumValues {
		hessian.RegisterJavaEnum(v)
	}
}
```

*   `init()`:  这是一个特殊的函数，在包被加载时自动执行。
*   它遍历 `_TestColorEnumValues` 映射中的所有键（即 `TestColorEnum` 枚举值），并使用 `hessian.RegisterJavaEnum()` 函数将它们注册到 Hessian 库中。  **这是至关重要的一步！**  只有注册过的枚举类型，Hessian 才能正确地序列化和反序列化。

**总结：**

这段代码通过以下几个关键步骤实现了 Go 中对 Java 枚举的模拟：

1.  **类型定义：** 使用 `iota` 创建整型常量，并定义基于 `hessian.JavaEnum` 的自定义类型。
2.  **双向映射：**  使用 map 维护枚举值和字符串之间的对应关系。
3.  **`JavaClassName()`：**  提供 Java 枚举类的完整类名，供 Hessian 协议使用。
4.  **`EnumValue()` 和 `NewTestColorEnum()`：**  用于反序列化 Java 枚举，将字符串名称转换为 Go 枚举值。
5.  **`init()`：**  注册枚举类型到 Hessian 库，使其能够正确地序列化和反序列化。

**类型安全性和可维护性：**

这种实现方式相比直接使用字符串，提高了类型安全性。编译器可以在一定程度上检查枚举值的正确性。  同时，通过使用映射表，使得代码更容易维护和扩展。 如果需要添加新的枚举值，只需要更新常量声明和映射表即可。

**与 Hessian 协议的关系：**

Hessian 协议是 Dubbo 中使用的序列化协议。 它需要在序列化和反序列化过程中知道 Java 对象的类型信息，才能正确地进行转换。  `JavaClassName()` 方法和 `RegisterJavaEnum()` 函数就是为了向 Hessian 协议提供这些信息。
