---
title: go 学习笔记
tags: [go,learn]
categories: [Back]
date: 2024-08-29T14:09:53+08:00
draft: true
---
### GoLang语法新奇

golang 中的表达式，加";"与不加都可以，建议不加

另外函数方法中的{}，符合 java 中的标准，需要放在函数名后面

#### 变量声明

```go
package main  
  
import "fmt"  
  
/*  
四种变量声明方式  
*/  


var x, y int

var ( //这种分解的写法,一般用于声明全局变量

a int

b bool

)
  
func main() {  
    //声明变量 默认为 0    var a int  
    fmt.Println("a = ", a)  
  
    // 方法二 声明变量，并初始化  
    var b int = 100  
    fmt.Println("b = ", b)  
  
    //方法三 （不推荐） 初始化省去数据类型，通过值来自动匹配数据类型  
    var c = 100  
    fmt.Println("c = ", c)  
  
    // 方法四：（最常用的方法）,只能用在函数体内  
    e := 100  
    fmt.Println("e = ", e)  
    fmt.Printf("type of e = %T", e)  
}
```

#### 常量声明

```go
package main
import "unsafe" 
const ( a = "abc" b = len(a) c = unsafe.Sizeof(a) ) 
func main(){
println(a, b, c) 
}
```

可以使用关键字`iota`在 const() 里，用来进行累加的

```go
const (

Apple, Banana = iota + 1, iota + 2

Cherimoya, Durian

Elderberry, Fig

)
```

#### 函数

##### 返回值

```go
package main  
  
import "fmt"  
  
func foo1(a string, b int) int {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    return c  
}  
  
// 可以返回多个返回值，匿名  
func foo2(a string, b int) (int, int) {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    return c, c  
}  
  
// 可以返回多个返回值，有形参名称  
func foo3(a string, b int) (r1 int, r2 int) {  
    fmt.Println("a:", a, "b:", b)  
  
    c := 1024  
  
    r1 = c  
    r2 = c * 2  
  
    return  
}  
  
// 形参名称可以一起定义，都有默认值 0func foo4() (r1, r2 int) {  
    r1 = 1  
    r2 = 2  
    return  
}  
  
func main() {  
  
    c := foo1("hello", 100)  
    fmt.Println(c)  
  
    ret1, ret2 := foo2("hello", 100)  
    fmt.Println("ret1:", ret1, "ret2:", ret2)  
  
    ret1, ret2 = foo3("hello", 100)  
    fmt.Println("ret1:", ret1, "ret2:", ret2)  
}
```

##### import

golang里面有两个保留的函数：init函数（能够应用于所有的package）和main函数（只能应用于package main）。这两个函数在定义时不能有任何的参数和返回值。  
  
虽然一个package里面可以写任意多个init函数，但这无论是对于可读性还是以后的可维护性来说，我们都强烈建议用户在一个package中每个文件只写一个init函数。  
  
go程序会自动调用init()和main()，所以你不需要在任何地方调用这两个函数。每个package中的init函数都是可选的，但package main就必须包含一个main函数。  
  
程序的初始化和执行都起始于main包。  
  
如果main包还导入了其它的包，那么就会在编译时将它们依次导入。有时一个包会被多个包同时导入，那么它只会被导入一次（例如很多包可能都会用到fmt包，但它只会被导入一次，因为没有必要导入多次）。  
  
当一个包被导入时，如果该包还导入了其它的包，那么会先将其它包导入进来，然后再对这些包中的包级常量和变量进行初始化，接着执行init函数（如果有的话），依次类推。  
  
等所有被导入的包都加载完毕了，就会开始对main包中的包级常量和变量进行初始化，然后执行main包中的init函数（如果存在的话），最后执行main函数。下图详细地解释了整个执行过程：

![[image-20240830200220684.png]]

导入时候的记得要加路径，从项目最开始的地方开始

`import _ "fmt"`给 `fmt` 包起别名，匿名，无法使用当前包的方法，但是会执行当前包内部的`init()` 方法

`import aa "fmt"`给 `fmt` 包起别名aa， `fmt.Println` 可以直接用 `aa.Println` 代替

`import . "fmt"`将当前fmt 包中的全部方法，导入到当前本包中，fmt 包中的所有方法可以直接使用 API 进行调用，无需使用 `fmt.API` 的形式

##### 指针

跟 c 类似，这里就不做阐述

#### defer

> 相当于 Java 中的 `finally` ，用于最后执行的东西。
> 
> `defer` 在 `return` 后面执行

`defer` 语句属于压栈的模式，先进后出

**应用场景**

defer语句会将其后的函数调用推迟到当前函数执行结束时执行。这个特性常用于处理成对的操作，如打开/关闭文件、获取/释放锁、连接/断开连接等，确保资源被适当地释放，即使在发生错误或提前返回的情况下也能保证执行。

#### 切片 slice

Go 语言切片是对数组的抽象。  
  
Go 数组的**长度不可改变**，在特定场景中这样的集合就不太适用，Go中提供了一种灵活，功能强悍的内置类型切片("动态数组"),与数组相比切片的长度是不固定的，可以追加元素，在追加时可能使切片的容量增大。

##### 定义切片  
  
你可以声明一个未指定大小的数组来定义切片：  
  
```go
var identifier []type
```

切片不需要说明长度。    

或使用make()函数来创建切片:  

```go
var slice1 []type = make([]type, len)
```

也可以简写为

```go
slice1 := make([]type, len)
```

也可以指定容量，其中capacity为可选参数。 意为数组的当前的最大长度，如果数组的 `len` 比 `cap` 要大，则 `cap *= 2` ，进行扩容，若不指定，则初始的 `cap = len`

```go
make([]T, length, capacity)
```

这里 len 是数组的长度并且也是切片的初始长度。

##### 判断是否为空

```go
// 判断 slice 是否为空
if slice == nil {
	fmt.Println("slice is empty")
} else {
	fmt.Println("slice is not empty")
}
```

好奇怪，在 go 里这个关键字叫 `nil`

##### 切片的添加

使用 `append` 方法

```go
var numbers []int

printSlice(numbers)

/* 允许追加空切片 */

numbers = append(numbers, 0)

printSlice(numbers)

/* 向切片添加一个元素 */

numbers = append(numbers, 1)

printSlice(numbers)

/* 同时添加多个元素 */

numbers = append(numbers, 2,3,4)

printSlice(numbers)
```
##### 切片的截取

```go
s1 := s[0:2] // 是左闭右开的区间，不写就默认头或尾
```

这些只是浅拷贝，如果原数组内的值更改，则截取原数组的数组内的值也会进行改变，如果不想出现这种情况则需要**深拷贝** `copy`

```go
/* 创建切片 numbers1 是之前切片的两倍容量*/

numbers1 := make([]int, len(numbers), (cap(numbers))*2)

/* 拷贝 numbers 的内容到 numbers1 */

copy(numbers1,numbers)
```

#### map

##### map 的声明

```go
//第一种声明,key 是 string, value 也是 string

var test1 map[string]string

//在使用map前，需要先make，make的作用就是给map分配数据空间

test1 = make(map[string]string, 10)

test1["one"] = "php"

test1["two"] = "golang"

test1["three"] = "java"

fmt.Println(test1) //map[two:golang three:java one:php]

//第二种声明

test2 := make(map[string]string)

test2["one"] = "php"

test2["two"] = "golang"

test2["three"] = "java"

fmt.Println(test2) //map[one:php two:golang three:java]  

//第三种声明

test3 := map[string]string{

"one" : "php",

"two" : "golang",

"three" : "java",

}

fmt.Println(test3) //map[one:php two:golang three:java]
```

##### map 的操作

```go
language := make(map[string]map[string]string)

language["php"] = make(map[string]string, 2)

language["php"]["id"] = "1"

language["php"]["desc"] = "php是世界上最美的语言"

language["golang"] = make(map[string]string, 2)

language["golang"]["id"] = "2"

language["golang"]["desc"] = "golang抗并发非常good"

fmt.Println(language) //map[php:map[id:1 desc:php是世界上最美的语言] golang:map[id:2 desc:golang抗并发非常good]]

//增删改查

val, key := language["php"] //查找是否有php这个子元素

if key {

	fmt.Printf("%v", val)

} else {

	fmt.Printf("no");

}

language["php"]["id"] = "3" //修改了php子元素的id值

language["php"]["nickname"] = "啪啪啪" //增加php元素里的nickname值

delete(language, "php") //删除了php子元素

fmt.Println(language)

for key, value := range language {

}// 遍历
```

map存储是无序的，遍历 Map 时返回的键值对的顺序是不确定

#### 结构体 struct

结构体的样式和 c 很像，类似于

```go
type Book sturct {
	title string
	auth string
} 

// 创建新对象
var book1 Book
```

##### 结构体标签

在结构体标签中，有类似于文档注释的东西，方便你了解怎么使用

```go
package main

import (
	"fmt"
	"reflect"
)

type resume struct {
	Name string `json:"name" doc:"我的名字"` //注意是反引号
}

func findDoc(stru interface{}) map[string]string {

	t := reflect.TypeOf(stru).Elem()
	doc := make(map[string]string)

	for i := 0; i < t.NumField(); i++ {

	//这里就是通过标签来获得值
	doc[t.Field(i).Tag.Get("json")] = t.Field(i).Tag.Get("doc")

	}
	return doc
}

  

func main() {

	var stru resume
	doc := findDoc(&stru)
	fmt.Printf("name字段为：%s\n", doc["name"])

}
```


#### interface与类型断言

##### interface接口的使用/多态

接口的创建方式（父类）

```go
type Animal interface {
	Sleep()
	GetColor() string
	GetType()  string
}
```

子类（直接实现父类的全部借口）

```go
type Cat struct {
	color string
}

func (this *Cat) Sleep() {
	fmt.Println("this cat is sleep")
}

func (this *Cat) GetColor() string {
	return this.color
}

func (this *Cat) GetType() string {
	return "Cat"
}
```

只要实现了所有的方法，那么这个子类就相当于父类的继承，类似于

```go
var animal Animal // 接口的数据类型，父类指针，注意是指针！
animal = &Cat{"Green"} 
animal.Sleep() // 这里调用的将会是 Cat 的 Sleep() 方法，多态的体现了，因为本身是 Animal 类
```

##### interface() 空接口

这是一个通用万能类型

 int、string、float32、float64、struct 都实现了 interface()

泛型，object？

```go
func muFunc(arg interface{}) {
	fmt.Println("myFunc is called")
	fmt.Println(arg)
}

func main() {
	myFunc(100)
	myFunc("abc")
	myFunc(3.14)
}
```

这些都能够成功输出，所以这个函数的入参什么都可以

##### 类型断言

> Golang的语言中提供了断言的功能。golang中的所有程序都实现了interface{}的接口，这意味着，所有的类型如string,int,int64甚至是自定义的struct类型都就此拥有了interface{}的接口，这种做法和java中的Object类型比较类似。那么在一个数据通过func funcName(interface{})的方式传进来的时候，也就意味着这个参数被自动的转为interface{}的类型。

```go
func funcName(a interface{}) string {

	return string(a)

}
```

编译器会返回

```go
cannot convert a (type interface{}) to type string: need type assertion
```

此时，意味着整个转化的过程需要类型断言。

```go
var a interface{}

value, ok := a.(string) //前面是接受接口的值，后面是判断类型是否正确，是 bool
```

#### 反射reflect

##### 变量的结构

`type` 和 `value` 组成的` pair` 是变量的结构

其中 `type` 可以分为 `static type` 和 `concrete type`，前者是基本的类型，比如 int，string，后者是具体的数据类型，虽然我并不是很清楚什么是具体（具体创造的类？）

 断言有两步：得到动态类型 type，判断 type 是否实现了目标接口。 

反射的原理就是基于interface 的 **pair** 来实现的


##### 反射的应用

jreflect.Value是通过reflect.ValueOf(X)获得的，只有当X是指针的时候，才可以通过reflec.Value修改实际变量X的值，即：要修改反射类型的对象就一定要保证其值是“addressable”的。

```go
package main

import (

"fmt"

"reflect"

)

func main() {

	var num float64 = 1.2345
	fmt.Println("old value of pointer:", num)
	// 通过reflect.ValueOf获取num中的reflect.Value，注意，参数必须是指针才能修改其值
	pointer := reflect.ValueOf(&num)
	newValue := pointer.Elem()

	fmt.Println("type of pointer:", newValue.Type())
	fmt.Println("settability of pointer:", newValue.CanSet())

	// 重新赋值
	newValue.SetFloat(77)
	fmt.Println("new value of pointer:", num)

	// 如果reflect.ValueOf的参数不是指针，会如何？

	pointer = reflect.ValueOf(num)

	//newValue = pointer.Elem() 
	// 如果非指针，这里直接panic，“panic: reflect: call of reflect.Value.Elem on float64 Value”

}

  

运行结果：

old value of pointer: 1.2345

type of pointer: float64

settability of pointer: true

new value of pointer: 77
```

