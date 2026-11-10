# DSH 学习看板

把 `Learning/` 里的学习状态接进 DeepSeek Harness：左侧面板查看当前重点、概念掌握度和低掌握度概念；需要时 Agent 可以按需读取学习画像和相关笔记。

当前只做看板，不包含 quiz、复习计划和自动写回。仓库路径暂时硬编码，后续再改成配置。

## 提供什么

Host 侧：

- `learner_state`：读取当前重点、概念总数、低掌握度概念和最近学习记录
- `learner_topic`：读取一个主题的概念掌握表和笔记原文
- `learner_search`：按关键词搜索知识库笔记
- `POST /api/learner/state`：给学习面板提供只读数据

Client 侧：

- 左侧栏「学习」入口（只保留这一个 UI 入口）
- 主面板：当前重点、低掌握度概念、掌握度分布、最近学习

## 数据文件

插件只读以下文件，不会自动修改：

```text
Learning/
  学习状态.md          # 当前重点、以后再学、暂停、背景经验、待办
  概念掌握.md          # 每个主题一张「概念 / 掌握度 / 证据」表
  记录/                # 可选：已有的学习记录，面板会显示
```

掌握度：`L0 未接触`、`L1 读过`、`L2 能复述`、`L3 能解释`、`L4 能应用`、`L5 能教别人`。这些暂时由你手动维护，或者通过 Obsidian 直接编辑。

## 配置

`cordis.patch.yml` 里的 `vaultPath` 暂时写死为当前仓库：

```yaml
- insert:
    - id: dsh-learner
      name: '@local/dsh-learner'
      config:
        vaultPath: '/Users/similarityyoung/Documents/Obsidian/Obsidian-Open'
        learningDir: 'Learning'
```

后面要支持多个仓库时，再把 `vaultPath` 改成配置项或自动发现。

## 安装

```bash
plugin_manager install_bundle /绝对路径/.agent/plugins/dsh-learner
```

安装后左侧栏会出现「学习」入口；插件不会自动往系统提示里注入内容。Agent 需要了解学习背景时，按需调用 `learner_state`、`learner_topic` 或 `learner_search`。

注意：当前 `ds-bot` 主题会通过 CSS 隐藏标准侧栏面板列表（`nav[class*="_panelList"]`），如果使用的是 DS Bot 侧栏，这个入口可能看不到；后续需要单独适配 DS Bot 的侧栏入口。
