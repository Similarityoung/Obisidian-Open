---
title: CSS
tags:
  - css学习笔记
categories:
  - Front
date: 2024-07-01T17:39:44+08:00
draft: false
---

# CSS

## 样式写在哪里

可以把 CSS 放在页面的 `style` 中，也可以通过 `link` 引入样式表。HTML 中 `style` 的 `type="text/css"` 可以省略。

```html
<style>
  p { color: red; font-size: 30px; }
</style>
<link rel="stylesheet" href="style.css">
```

原教程的属性示意图：

![](http://img.smyhvae.com/20170710_1605.png)

参考：[MDN style](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/style)。

## 字体回退

`font-family` 从前往后选择能够显示对应字符的字体。不要假定所有设备都安装了同一种字体，末尾可加通用字体族。

```css
body { font-family: Arial, "Microsoft YaHei", sans-serif; }
```

需要指定字体文件时，可用 `@font-face` 加载。

### 基本选择器

- 标签选择器：针对**一类**标签

```CSS
p{ font-size:14px; }
```

- ID 选择器：针对某**一个**特定的标签使用

```CSS
#mytitle{ border:3px dashed green; }
```

- 类选择器：针对**你想要的所有**标签使用

```css
.one{ width:800px; }
```

- 通用选择器（通配符）：针对所有的标签都适用

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



## 伪类

- `:link` / `:visited`：尚未访问 / 已访问的链接。
- `:hover`：指针悬停。
- `:active`：元素处于激活状态。
- `:focus`：元素获得焦点。

链接样式常按 `link → visited → hover → active` 排列，避免同等优先级的规则相互覆盖。这不意味着所有状态都必须写。

## 动画练习

用 `@keyframes` 定义关键帧，`animation` 指定动画名称、持续时间等参数。以下示例同时改变位置、颜色和圆角：

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
