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
        func(dog);
        System.out.println(dog.getObjectAddress()); // Dog@4554617c
        System.out.println(dog.getName());          // A
    }

    private static void func(Dog dog) {
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
        func(dog);
        System.out.println(dog.getName());          // B
    }

    private static void func(Dog dog) {
        dog.setName("B");
    }
}
```

### 抽象类与接口
#### 比较抽象类与接口
- 接口的字段默认都是 static 和 final 的。
- 从设计层面上看，抽象类提供了一种 IS-A 关系，那么就必须满足里式替换原则，即子类对象必须能够替换掉所有父类对象。而接口更像是一种 LIKE-A 关系，它只是提供一种方法实现契约，并不要求接口和实现接口的类具有 IS-A 关系。
- 从使用上来看，一个类可以实现多个接口，但是不能继承多个抽象类。
- 接口的字段只能是 static 和 final 类型的，而抽象类的字段没有这种限制。
- 接口的成员只能是 public 的，而抽象类的成员可以有多种访问权限。

#### 使用选择

##### 使用接口

- 需要让不相关的类都实现一个方法，例如不相关的类都可以实现 Compareable 接口中的 compareTo() 方法；
- 需要使用多重继承。

##### 使用抽象类

- 需要在几个相关的类中共享代码。
- 需要能控制继承来的成员的访问权限，而不是都为 public。
- 需要继承非静态和非常量字段。

在很多情况下，接口优先于抽象类，因为接口没有抽象类严格的类层次结构要求，可以灵活地为一个类添加行为。并且从 Java 8 开始，接口也可以有默认的方法实现，使得修改接口的成本也变的很低。

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

# stream 流

## 优势

在 Java 中使用 `Stream` API 的原因有很多，它不仅提供了一种更声明式的数据处理方式，而且还带来了代码可读性的提升、编写更简洁的代码以及更强大的数据处理能力。以下是使用 `Stream` API 的主要优点：

### 1. **更好的代码可读性**

`Stream` API 允许你以一种接近自然语言的方式来表达复杂的数据处理逻辑。这种风格可以让其他开发者更容易理解代码的意图，因为它减少了样板代码并且聚焦于“做什么”而不是“怎么做”。

### 2. **增强的编码效率**

通过 `Stream` API，可以利用丰富的操作符（如 `map`, `filter`, `reduce` 等）来简化集合的处理。这避免了传统的循环和条件语句，减少了代码量，使得编写和维护都更为简单。

### 3. **不可变性与线程安全**

`Stream` 操作生成的结果可以是不可变对象，这自然地支持了函数式编程的风格，降低了并发环境中的复杂性。因为数据本身不被修改，所以多线程操作同一数据源时，不必担心数据被意外改变，这提高了程序的健壮性。

### 4. **支持并行处理**

`Stream` API 支持无缝的并行处理，只需将 `stream()` 调用更改为 `parallelStream()`，就可以利用多核处理器自动并行处理数据。这使得在处理大数据集时可以显著提高性能，而代码改动极小。

### 5. **链式调用**

`Stream` 的操作可以通过链式调用来组合，这让多个操作可以在一行代码中完成，从而使得处理流程非常直观且易于管理。

### 6. **减少错误**

使用传统的 for-loop 或 while-loop 进行复杂的数据处理时，管理循环变量和退出条件容易出错。`Stream` API 抽象了这些元素，减少了出错的机会。

### 7. **集成更多操作**

`Stream` API 集成了许多有用的操作，使得数据转换、过滤、求最值、排序等操作变得简单快捷。同时也支持统计、分组、区分处理等复杂的操作，大大提高了处理集合数据的能力。

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

`Stream` API 的强大之处在于这些操作可以以几乎无限的方式组合，提供了极大的灵活性和强大的数据处理能力。