# DSH 学习插件

把 `Learning/` 里的学习者画像接进 DeepSeek Harness：Agent 在讲解、出题和规划学习时，先读学情；学完以后把证据写回画像。

## 提供什么

Host 侧：

- 5 个工具：`learner_state`、`learner_topic`、`learner_search`、`learner_next`、`learner_record`
- 3 个 skill：`learn`（诊断式教学）、`quiz`（出题评分）、`review`（间隔复习）
- 1 个自动注入的系统提示词区段：每次请求带上当前重点、待复习和最近学习摘要
- 1 个只读看板 API：`POST /api/learner/state`

Client 侧：

- 侧栏「学习」入口和主面板：当前重点、待复习、掌握度分布、最近学习
- 编辑器下方的「学习」入口 / 侧栏底部入口，方便随时打开

## 数据文件

插件读取和写入都在配置的 `vaultPath` 下：

```text
Learning/
  学习状态.md          # 读：当前重点、以后再学、暂停、背景经验、待办
  概念掌握.md          # 读写：每个主题一张「概念 / 掌握度 / 证据 / 下次复习」表
  记录/
    2026-11-07 214943 - Agent 系统.md   # 每次学习一条记录
```

第一次启动时，如果 `概念掌握.md` 不存在，插件会从 `学习状态.md` 的「当前重点」主题页生成初始概念表：有细类列表的页面按细类展开（例如 Agent 系统的 50 个细类），否则按二级标题（例如软件工程与协作的 5 个问题）。掌握度统一标为 `L1 读过`，证据写「待诊断」。之后由 `learner_record` 更新。

掌握度：`L0 未接触`、`L1 读过`、`L2 能复述`、`L3 能解释`、`L4 能应用`、`L5 能教别人`。没有证据的掌握度不要往高写。

## 配置

`cordis.patch.yml` 里的 `vaultPath` 指向当前仓库：

```yaml
- insert:
    - id: dsh-learner
      name: '@local/dsh-learner'
      config:
        vaultPath: '/Users/similarityyoung/Documents/Obsidian/Obsidian-Open'
        learningDir: 'Learning'
```

换知识库时改 `vaultPath`，插件重新加载后生效。

## 安装

```bash
plugin_manager install_bundle /绝对路径/.agent/plugins/dsh-learner
```

安装后：Plugin Manager 会显示「学习」；侧栏 / 编辑器下方 / 设置里可以打开学习面板；模型会看到 `learner_*` 工具和 `learn`、`quiz`、`review` 三个 skill。

## 最小闭环

1. 用户说「今天学点什么」或「教我 X」
2. Agent 调 `learner_state` / `learner_next`，再调 `learner_topic`
3. Agent 用 3 个问题诊断：回忆 → 解释 → 应用
4. 按当前水平讲解，让用户用自己的话复述
5. 结束后调 `learner_record`，写学习记录、更新概念表和下次复习
