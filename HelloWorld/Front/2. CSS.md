---
title: CSS
tags:
  - css学习笔记
categories:
  - Front
date: 2024-07-01T17:39:44+08:00
draft: false
---
#### 字体属性的说明

（1）网页中不是所有字体都能用，因为这个字体要看用户的电脑里面装没装，比如你设置：

```css
	font-family: "华文彩云";
```

上方代码中，如果用户的 Windows 电脑里面没有这个字体，那么就会变成宋体。

页面中，中文我们一般使用：微软雅黑、宋体、黑体。英文使用：Arial、Times New Roman。页面中如果需要其他的字体，就需要单独安装字体，或者切图。

（2）为了防止用户电脑里，没有微软雅黑这个字体。就要用英语的逗号，提供备选字体。如下：（可以备选多个）

```css
	font-family: "微软雅黑","宋体";
```

上方代码表示：如果用户电脑里没有安装微软雅黑字体，那么就是宋体。

（3）我们须将英语字体放在最前面，这样所有的中文，就不能匹配英语字体，就自动的变为后面的中文字体：

```css
	font-family: "Times New Roman","微软雅黑","宋体";
```

上方代码的意思是，英文会采用Times New Roman字体，而中文会采用微软雅黑字体（因为美国人设计的Times New Roman字体并不针对中文，所以中文会采用后面的微软雅黑）。比如说，对于`smyhvae哈哈哈`这段文字，`smyhvae`会采用Times New Roman字体，而`哈哈哈`会采用微软雅黑字体。

### CSS 整体感知

我们先来看一段简单的 css 代码：

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Document</title>
        <style>
            p {
                color: red;
                font-size: 30px;
                text-decoration: underline;
                font-weight: bold;
                text-align: center;
                font-style: italic;
            }
            h1 {
                color: blue;
                font-size: 50px;
                font-weight: bold;
                background-color: pink;
            }
        </style>
    </head>
    <body>
        <h1>我是大标题</h1>
        <p>我是内容</p>
    </body>
</html>
```


解释如下：

![](http://img.smyhvae.com/20170710_1605.png)

我们写 css 的地方是 style 标签，就是“样式”的意思，写在 head 里面。后面的课程中我们将知道，css 也可以写在单独的文件里面，现在我们先写在 style 标签里面。

如果在 sublime 中输入`<st`或者`<style`然后按 tab 键，可以自动生成的格式如下：（建议）

```html
<style type="text/css"></style>
```

type 表示“类型”，text 就是“纯文本”，css 也是纯文本。

但是，如果在 sublime 中输入`st`或者`style`然后按 tab 键，可以自动生成的格式如下：（不建议）

```html
<style></style>
```

css 对换行不敏感，对空格也不敏感。但是一定要有标准的语法。冒号，分号都不能省略。

### 基本选择器

- 标签选择器：针对**一类**标签

```CSS
p{ font-size:14px; }
```

- ID 选择器：针对某**一个**特定的标签使用

```CSS
#mytitle{ border:3px dashed green; } /*不建议使用*/
```

- 类选择器：针对**你想要的所有**标签使用

```css
.one{ width:800px; }
```

- 通用选择器（通配符）：针对所有的标签都适用（不建议使用）

```css
* {
    margin-left: 0px;
    margin-top: 0px;
}
```

### 高级选择器

#### 后代选择器

- 定义的时候用空格隔开

```html
<style type="text/css">
    .div1 p {
        color: red;
    }
</style>
```

#### 交集选择器

- 定义的时候紧密相连

```css
h3.special {
    color: red;
}
```

#### 并集选择器

- 定义的时候用逗号隔开，三种基本选择器都可以放进来。

```css
p,h1,.title1,#one {
    color: red;
}
```

### 静态伪类选择器、动态伪类选择器

伪类选择器分为两种。

#### **静态伪类**：只能用于**超链接**的样式

- `:link` 超链接点击之前

- `:visited` 链接被访问过之后

PS：以上两种样式，只能用于超链接。

#### **动态伪类**：针对**所有标签**都适用的样式

- `:hover` “悬停”：鼠标放到标签上的时候

- `:active` “激活”： 鼠标点击标签，但是不松手时。

- `:focus` 是某个标签获得焦点时的样式（比如某个输入框获得焦点）

#### 超链接的四种状态

a标签有4种伪类（即对应四种状态），要求背诵。如下：

- `:link` “链接”：超链接点击之前
- `:visited` “访问过的”：链接被访问过之后
- `:hover` “悬停”：鼠标放到标签上的时候
- `:active` “激活”： 鼠标点击标签，但是不松手时。

必须按照顺序书写，在写`a:link`、`a:visited`这两个伪类的时候，要么同时写，要么同时不写。如果只写`a`属性和`a:link`属性，不规范。

### CSS动画

```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title></title>
    <style>
        .box {
            width: 100px;
            height: 100px;
            margin: 100px;
            background-color: red;

            /* 调用动画*/
            /* animation: 动画名称 持续时间  执行次数  是否反向  运动曲线 延迟执行。infinite 表示无限次*/
            /*animation: move 1s  alternate linear 3;*/
            animation: move2 4s;
        }

        /* 方式一：定义一组动画*/
        @keyframes move1 {
            from {
                transform: translateX(0px) rotate(0deg);
            }
            to {
                transform: translateX(500px) rotate(555deg);
            }
        }

        /* 方式二：定义多组动画*/
        @keyframes move2 {
            0% {
                transform: translateX(0px) translateY(0px);
                background-color: red;
                border-radius: 0;
            }

            25% {
                transform: translateX(500px) translateY(0px);

            }

            /*动画执行到 50% 的时候，背景色变成绿色，形状变成圆形*/
            50% {
                /* 虽然两个方向都有translate，但其实只是Y轴上移动了200px。
                因为X轴的500px是相对最开始的原点来说的。可以理解成此时的 translateX 是保存了之前的位移 */
                transform: translateX(500px) translateY(200px);
                background-color: green;
                border-radius: 50%;
            }

            75% {
                transform: translateX(0px) translateY(200px);
            }

            /*动画执行到 100% 的时候，背景色还原为红色，形状还原为正方形*/
            100% {
                /*坐标归零，表示回到原点。*/
                transform: translateX(0px) translateY(0px);
                background-color: red;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
<div class="box">

</div>
</body>
</html>

```

好用吗