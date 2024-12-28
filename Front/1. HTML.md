---
title: HTML
tags:
  - html学习笔记
categories:
  - Front
date: 2024-06-27T22:17:44+08:00
draft: false
---
### div和span的区别

`<span>`和`<div>`唯一的区别在于：`<span>`是不换行的，而`<div>`是换行的。

如果单独在网页中插入这两个元素，不会对页面产生任何的影响。这两个元素是专门为定义CSS样式而生的。或者说，DIV+CSS来实现各种样式。

div在浏览器中，默认是不会增加任何的效果的，但是语义变了，div中的所有元素是一个小区域。 div标签是一个**容器级**标签，里面什么都能放，甚至可以放div自己。

span也是表达“小区域、小跨度”的标签，但只是一个**文本级**的标签。 就是说，span里面只能放置文字、图片、表单元素。 span里面不能放p、h、ul、dl、ol、div。

#### span举例

```html
<p>
	简介简介简介简介简介简介简介简介
	<span>
		<a href="">详细信息</a>
		<a href="">购买</a>
	</span>
</p>

```
#### div举例

```html
<div class="header">
	<div class="logo"></div>
	<div class="nav"></div>
</div>
<div class="content">
	<div class="guanggao"></div>
	<div class="dongxi"></div>
</div>
<div class="footer"></div>
```

我们亲切地称这种模式叫做“**div+css**”：**div标签负责布局、结构、分块，css负责样式**。

### 表格标签

表格标签用`<table>`表示。 一个表格`<table>`是由每行`<tr>`组成的，每行是由每个单元格`<td>`组成的。 所以我们要记住，一个表格是由行组成的（行是由列组成的），而不是由行和列组成的。 在以前，要想固定标签的位置，唯一的方法就是表格。现在可以通过CSS定位的功能来实现。但是现在在做页面的时候，表格作用还是有一些的。

#### `<table>`属性

- `border`：边框。像素为单位。

- `style="border-collapse:collapse;"`：单元格的线和表格的边框线合并（表格的两边框合并为一条）

- `width`：宽度。像素为单位。

- `height`：高度。像素为单位。

- `bordercolor`：表格的边框颜色。

- `align`：**表格**的水平对齐方式。属性值可以填：left right center。 注意：这里不是设置表格里内容的对齐方式，如果想设置内容的对齐方式，要对单元格标签`<td>`进行设置）

- `cellpadding`：单元格内容到边的距离，像素为单位。默认情况下，文字是紧挨着左边那条线的，即默认情况下的值为0。 注意不是单元格内容到四条边的距离哈，而是到一条边的距离，默认是与左边那条线的距离。如果设置属性`dir="rtl"`，那就指的是内容到右边那条线的距离。

- `cellspacing`：单元格和单元格之间的距离（外边距），像素为单位。默认情况下的值为0

- `bgcolor="#99cc66"`：表格的背景颜色。

- `background="路径src/..."`：背景图片。 背景图片的优先级大于背景颜色。

- `bordercolorlight`：表格的上、左边框，以及单元格的右、下边框的颜色

- `bordercolordark`：表格的右、下边框，以及单元格的上、左的边框的颜色 这两个属性的目的是为了设置3D的效果。

- `dir`：公有属性，单元格内容的排列方式(direction)。 可以 取值：`ltr`：从左到右（left to right，默认），`rtl`：从右到左（right to left） 既然说`dir`是共有属性，如果把这个属性放在任意标签中，那表明这个标签的位置可能会从右开始排列。

#### `<tr>`行

一个表格就是一行一行组成的。

**属性：**

- `dir`：公有属性，设置这一行单元格内容的排列方式。可以取值：
    - `ltr`：从左到右（left to right，默认）
    - `rtl`：从右到左（right to left）

- `bgcolor`：设置这一行的单元格的背景色。 注：没有background属性，即：无法设置这一行的背景图片，如果非要设置，可以用css实现。

- `height`：一行的高度

- `align="center"`：一行的内容水平居中显示，取值：left、center、right

- `valign="center"`：一行的内容垂直居中，取值：top、middle、bottom

#### `<td>`单元格

**属性：**

- `align`：内容的横向对齐方式。属性值可以填：left right center。如果想让每个单元格的内容都居中，这个属性太麻烦了，以后用css来解决。

- `valign`：内容的纵向对齐方式。属性值可以填：top middle bottom

- `width`：绝对值或者相对值(%)

- `height`：单元格的高度

- `bgcolor`：设置这个单元格的背景色。

- `background`：设置这个单元格的背景图片。

#### 单元格的合并

单元格的属性：

- `colspan`：横向合并。例如`colspan="2"`表示当前单元格在水平方向上要占据两个单元格的位置。

- `rowspan`：纵向合并。例如`rowspan="2"`表示当前单元格在垂直方向上要占据两个单元格的位置。

### 框架标签

如果我们希望在一个网页中显示多个页面，那框架标签就派上用场了。

> - 注意，框架标签不能放在`<body>`标签里面，因为`<body>`标签代表的只是一个页面，而框架标签代表的是多个页面。于是：`<frameset>`和`<body>`只能二选一。
> - 框架的集合用`<frameset>`表示，然后在`<frameset>`集合里放入一个一个的框架`<frame>`

**补充**：`frameset`和`frame`已经从 Web标准中删除，建议使用 iframe 代替。

#### 内嵌框架

内嵌框架用`<iframe>`表示。`<iframe>`是`<body>`的子标记。

内嵌框架inner frame：嵌入在一个页面上的框架(仅仅IE、新版google浏览器支持，可能有其他浏览器也支持，暂时我不清楚)。

**属性：**

- `src="subframe/the_second.html"`：内嵌的那个页面
- `width=800`：宽度
- `height=“150`：高度
- `scrolling="no"`：是否需要滚动条。默认值是true。
- `name="mainFrame"`：窗口名称。公有属性。

标准的div+css页面，只会用到种类很少的标签：

```html
div  p  h1  span   a   img   ul   ol    dl    input
```

知道每个标签的特殊用法、属性。比如a标签，img的属性

