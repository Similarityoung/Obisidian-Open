---
title: java 基础
tags:
  - java
categories:
  - Java
date: 2024-10-31T18:31:07+08:00
draft: true
---

### 参数传递

Java 的参数是以值传递的形式传入方法中，而不是引用传递。

以下代码中 Dog dog 的 dog 是一个指针，存储的是对象的地址。在将一个参数传入一个方法时，本质上是将对象的地址以值的方式传递到形参中。因此在方法中改变指针引用的对象，那么这两个指针此时指向的是完全不同的对象，一方改变其所指向对象的内容对另一方没有影响。
```java
public class Dog {
    String name;

    Dog(String name) {
        this.name = name;
    }

    String getName() {
        return this.name;
    }

    void setName(String name) {
        this.name = name;
    }

    String getObjectAddress() {
        return super.toString();
    }
}
```

```java
public class PassByValueExample {
    public static void main(String[] args) {
        Dog dog = new Dog("A");
        System.out.println(dog.getObjectAddress()); // Dog@4554617c
        reassignDogReference(dog);
        System.out.println(dog.getObjectAddress()); // Dog@4554617c
        System.out.println(dog.getName());          // A
    }

    private static void reassignDogReference(Dog dog) {
        System.out.println(dog.getObjectAddress()); // Dog@4554617c
        dog = new Dog("B");
        System.out.println(dog.getObjectAddress()); // Dog@74a14482
        System.out.println(dog.getName());          // B
    }
}
```

但是如果在方法中改变对象的字段值会改变原对象该字段值，因为改变的是同一个地址指向的内容。

```java
class PassByValueExample {
    public static void main(String[] args) {
        Dog dog = new Dog("A");
        modifyDogName(dog);
        System.out.println(dog.getName());          // B
    }

    private static void modifyDogName(Dog dog) {
        dog.setName("B");
    }
}
```

### 抽象类与接口
接口表达可实现的行为契约，一个类可以实现多个接口；抽象类适合相关类共享状态和实现，一个类只能继承一个父类。

- 接口字段隐含为 `public static final`。
- 接口可以声明抽象方法，也支持 `default`、`static` 方法；Java 9 起可有私有辅助方法。
- 抽象类可以保存实例状态，并按需要设置成员访问权限。

需要可替换的行为时用接口；确实存在共享状态和实现的继承关系时，再考虑抽象类。

### 重写与重载

**1. 重写(Override)**

存在于继承体系中，指子类实现了一个与父类在方法声明上完全相同的一个方法。

为了满足里式替换原则，重写有以下两个限制:

- 子类方法的访问权限必须大于等于父类方法；
- 子类方法的返回类型必须是父类方法返回类型或为其子类型。

使用 @Override 注解，可以让编译器帮忙检查是否满足上面的两个限制条件。

**2. 重载(Overload)**

存在于同一个类中，指一个方法与已经存在的方法名称上相同，但是参数类型、个数、顺序至少有一个不同。

应该注意的是，返回值不同，其它都相同不算是重载。

### 泛型接口

- 简单的泛型接口

```
interface Info<T>{        // 在接口上定义泛型  
    public T getVar() ; // 定义抽象方法，抽象方法的返回值就是泛型类型  
}  
class InfoImpl<T> implements Info<T>{   // 定义泛型接口的子类  
    private T var ;             // 定义属性  
    public InfoImpl(T var){     // 通过构造方法设置属性内容  
        this.setVar(var) ;    
    }  
    public void setVar(T var){  
        this.var = var ;  
    }  
    public T getVar(){  
        return this.var ;  
    }  
} 
public class GenericsDemo24{  
    public static void main(String arsg[]){  
        Info<String> i = null;        // 声明接口对象  
        i = new InfoImpl<String>("汤姆") ;  // 通过子类实例化对象  
        System.out.println("内容：" + i.getVar()) ;  
    }  
}  
```

## Stream

Stream 把集合处理写成“数据源 → 中间操作 → 终端操作”。`filter`、`map` 等中间操作描述处理流程，`collect`、`reduce` 等终端操作产生结果。

它适合组合筛选、转换和聚合，但不自动保证结果不可变或线程安全。并行流也不一定更快；要避免在操作中修改共享状态，并根据实际数据和工作量判断是否并行。

参考：[Java Stream 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/stream/package-summary.html)。

## 常见的 `Stream` 操作

### 1. `filter`

`filter` 方法用于从流中选择符合给定谓词（一个返回布尔值的函数）的元素。它是一个中间操作，这意味着它返回一个新的流，可以继续链式调用其他 `Stream` 操作。`filter` 方法是用来进行条件筛选的。

**示例代码：**

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "Dave"); List<String> filteredNames = names.stream()
	.filter(name -> name.startsWith("A"))
	.collect(Collectors.toList()); // 结果：["Alice"]
```

### 2. `collect`

`collect` 是一个终端操作，它允许通过指定的 `Collector` 将流中的元素累积成一个汇总结果，常见的汇总结果包括列表、集合或者其他复杂的结构如字符串拼接、分组等。

**示例代码：**

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "Dave"); 
String result = names.stream()                      
	.filter(name -> name.length() > 3)
	.collect(Collectors.joining(", ")); // 结果："Alice, Charlie, Dave"
```

### 其他常见的 `Stream` 操作

除了 `filter` 和 `collect`，还有许多其他有用的 `Stream` 操作：

- **`map`**（中间操作）: 对流中的每个元素应用一个函数，并将结果作为新的流元素。常用于转换元素。

    ```java
List<Integer> lengths = names.stream()                              
    .map(String::length)                              
    .collect(Collectors.toList()); // 将名字转换为它们的长度
    ```

- **`flatMap`**（中间操作）: 用于将流中的每个元素转换成一个流，然后将这些流“扁平化”为一个新的流。

    ```java
List<List<String>> listOfLists = Arrays.asList(Arrays.asList("a","b"),Arrays.asList("c", "d")); 
List<String> flatList = listOfLists.stream()
    .flatMap(List::stream)
    .collect(Collectors.toList()); // 结果：["a", "b", "c", "d"]
    ```

- **`sorted`**（中间操作）: 对流中的元素进行排序。

    ```java
List<String> sortedNames = names.stream()
    .sorted()
    .collect(Collectors.toList());
    ```

- **`distinct`**（中间操作）: 返回一个包含唯一元素的流，按照遇到的顺序确定唯一性。

    ```java
List<String> uniqueItems = Stream.of("a", "b", "a", "c", "b", "d")
    .distinct()
    .collect(Collectors.toList()); // 结果：["a", "b", "c", "d"]
    ```

- **`limit`**（中间操作）: 截取流中的前N个元素。

    ```java
List<String> limited = names.stream()
    .limit(2)
    .collect(Collectors.toList()); // 结果：["Alice", "Bob"]
    ```

- **`forEach`**（终端操作）: 对流中的每个元素执行一个操作，通常用于调用方法或打印。

```java
names.stream()
    .forEach(System.out::println);
```

- **`reduce`**（终端操作）: 将流中的元素组合起来，使用一个初始值，通过一个二元操作。

```java
int sum = Stream.of(1, 2, 3, 4)
	.reduce(0, (a, b) -> a + b); // 结果：10
```

