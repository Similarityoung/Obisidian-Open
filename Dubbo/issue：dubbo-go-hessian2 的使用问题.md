---
title: 
tags:
  - issue
categories:
  - Dubbo
date: 2025-04-03T21:17:51+08:00
draft: true
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

这是一个对于序列化的类型的使用错误问题，通过查阅相关资料我了解到 java 的 int是 4 字节，而在 go 中 int型是 8 字节，具体类型如下展示：

```
int类型的大小为 8 字节 
int8类型大小为 1 字节 
int16类型大小为 2 字节 
int32类型大小为 4 字节 
int64类型大小为 8 字节
```

官方文档中

`int is a signed integer type that is at least 32 bits in size. It is a distinct type, however, and not an alias for, say, int32.`

另外

uint is a variable sized type, on your 64 bit computer uint is 64 bits wide.  

uint和uint8等都属于无符号int类型，uint类型长度取决于 CPU，如果是32位CPU就是4个字节，如果是64位就是8个字节。

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

实现原理为