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
