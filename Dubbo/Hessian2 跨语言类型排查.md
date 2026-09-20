---
title: Hessian2 跨语言类型排查
tags:
  - issue
categories:
  - Dubbo
date: 2025-04-03T21:17:51+08:00
draft: false
---

# Hessian2 跨语言类型排查

Issue：[dubbo-go 调用问题](https://github.com/apache/dubbo-go/issues/2728)。

## 复现环境与问题

- Java Server：Dubbo v3.0.14。
- Go Client：Dubbo-go v3.1.1。
- Dubbo 协议，Nacos v2.1.2。

Go 客户端无法调用 Java 服务。在调试并复现后，问题定位到 `QueryDataSource` 的参数类型。

## 整数类型匹配

原来的客户端字段声明：

```go
QueryDataSource func(ctx context.Context, id int) (*DataSource, error) `dubbo:"queryDataSource"`
```

Java 的 `int` 固定为 32 位，Go 的 `int` 与平台有关，不能仅凭名字相同就认为跨语言映射相同。对应 Java `int` 的参数改用明确的 `int32`：

```go
QueryDataSource func(ctx context.Context, id int32) (*DataSource, error) `dubbo:"queryDataSource"`
```

Go 的 `int` / `uint` 与平台有关；`int8`、`int16`、`int32`、`int64` 及相应固定宽度的无符号类型，宽度由类型名确定。这里是针对该调用签名提出的修改，不应把所有参数都统一替换成 `int32`。

## Java 枚举如何表示

原定义直接把 Java 枚举映射为字符串：

```go
Type string `hessian:"type"` // Mapped from Java enum
```

可以使用 [dubbo-go-hessian2 枚举生成工具](https://github.com/apache/dubbo-go-hessian2/blob/master/tools/gen-go-enum/README.md)，保留 Java 类名、枚举名称和注册信息。下面是一份生成代码示例：

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

关键在这几个位置：

- `TestColorEnum` 基于 `hessian.JavaEnum` 定义枚举值。
- 两张 map 维护 Go 值与 Java 名称之间的双向映射。
- `JavaClassName()` 提供完整 Java 类名。
- `String()` 输出枚举名称，未知值则输出数值字符串。
- `EnumValue()` 返回 `hessian.JavaEnum`，`NewTestColorEnum()` 返回具体类型；未知名称对应无效枚举值。
- `init()` 调用 `RegisterJavaEnum` 完成注册。

跨语言调用不仅要对齐值，也要对齐方法签名与序列化类型信息。
