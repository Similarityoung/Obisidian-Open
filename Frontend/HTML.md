---
title: HTML
tags:
  - html学习笔记
categories:
  - Front
date: 2024-06-27T22:17:44+08:00
draft: false
---

# HTML

## div 与 span

`div` 和 `span` 都是没有特定语义的容器。浏览器默认把 `div` 显示为块级元素，把 `span` 显示为行内元素；CSS 可以改变显示方式。`span` 用于段落中的短片段，内容应符合短语内容的要求。

```html
<p>
	简介简介简介简介简介简介简介简介
	<span>
		<a href="">详细信息</a>
		<a href="">购买</a>
	</span>
</p>

```

`div` 可以用于组织页面区域；有明确语义时，也可以使用 `header`、`nav`、`main`、`footer` 等元素。

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

## 表格

`table` 表示表格，`tr` 表示行，`th` 表示表头单元格，`td` 表示数据单元格。表格用来表达表格数据。

- `colspan="2"`：单元格跨两列。
- `rowspan="2"`：单元格跨两行。
- 边框、宽高、背景、对齐和单元格间距交给 CSS。

```html
<table>
  <tr><th>主题</th><th>状态</th></tr>
  <tr><td>HTML</td><td>学习中</td></tr>
  <tr><td colspan="2">合并两列</td></tr>
</table>
```

```css
table { border-collapse: collapse; }
th, td { border: 1px solid #ccc; padding: 8px; }
```

旧教程中的 `cellpadding`、`cellspacing`、`bgcolor`、`align` 等表格属性已过时。参考：[MDN table](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table)。

## iframe

`iframe` 在当前页面中嵌入另一份文档，可以放在 `body` 内。旧的 `frame` / `frameset` 已被废弃。

```html
<iframe src="subframe/the_second.html"
        title="子页面" width="800" height="150"></iframe>
```

嵌入不可信内容时，需要根据用途配置 `sandbox` 和允许的能力。
