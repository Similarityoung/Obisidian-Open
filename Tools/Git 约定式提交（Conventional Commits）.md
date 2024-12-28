---
title: Git 约定式提交（Conventional Commits）
tags:
  - git
  - commit
categories:
  - Tools
date: 2024-09-17T16:57:35+08:00
draft: false
---
约定式提交（Conventional Commits）是一种用于写作提交消息的规范，它规定了一套标准化的提交消息格式，以使得项目的版本控制更加清晰和一致。采用这种规范的好处是能够帮助开发团队更好地理解代码的变更历史、生成变更日志（changelog），以及进行版本控制。

### 约定式提交的基本格式

```git
<类型>(<范围>): <描述> 

<主体> 

<footer>
```

### 各部分说明

1. **类型（type）**：用于说明提交的类型，例如是修复bug还是添加新功能。常见的类型包括：

- `feat`：新功能（feature）

- `fix`：修补bug

- `docs`：文档（documentation）变更

- `style`：代码格式（不影响代码运行的变动）

- `refactor`：重构（即不是新增功能，也不是修改bug的代码变动）

- `test`：增加测试

- `chore`：构建过程或辅助工具的变动

 2. **范围（scope）**：可选项，用于说明提交影响的范围（例如模块、文件等）。

3. **描述（subject）**：简要说明提交的内容。

4. **主体（body）**：可选项，用于详细说明提交的内容，可以分成多行。

5. **脚注（footer）**：可选项，用于说明重大变更，或者关联的issue。例如：

- `BREAKING CHANGE`：说明重大变更

- `Closes #123`：关闭issue


### 示例

```
feat(auth): add login functionality

Added login functionality with OAuth2 integration. Users can now log in using their Google account.

Closes #45
```
