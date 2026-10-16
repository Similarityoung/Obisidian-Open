#!/usr/bin/env bash
#
# ralph.sh —— Ralph Loop 的最小实现
#
# 每轮启动一个全新的 Agent 会话。提示词不变，变化的是工作区：
# 上一轮把进展写进状态文件，下一轮读它继续做。
#
# 用法：
#   Tools/ralph.sh                        # 用 PROMPT.md，最多 10 轮
#   Tools/ralph.sh -n 5                   # 最多 5 轮
#   Tools/ralph.sh -p tasks/PROMPT.md     # 换一个任务提示词
#   Tools/ralph.sh --dry-run              # 只打印提示词和命令，不调用模型
#
# 每轮都会真的调用模型并消耗 Token。先跑 --dry-run 看清楚再跑正式的。
#
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

PROMPT_FILE="PROMPT.md"
STATE_FILE=".ralph/progress.md"
LOG_DIR=".ralph/logs"
MAX_ROUNDS=10
DONE_MARKER="ralph done"
DRY_RUN=0

# 换 Agent 命令（默认调 Claude Code）：RALPH_AGENT_CMD='codex exec' Tools/ralph.sh
if [ -n "${RALPH_AGENT_CMD:-}" ]; then
  read -r -a AGENT <<<"$RALPH_AGENT_CMD"
else
  AGENT=(claude -p)
fi

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -p|--prompt) PROMPT_FILE="$2"; shift 2 ;;
    -s|--state)  STATE_FILE="$2";  shift 2 ;;
    -n|--rounds) MAX_ROUNDS="$2";  shift 2 ;;
    --dry-run)   DRY_RUN=1;        shift ;;
    -h|--help)   usage 0 ;;
    *) echo "未知参数：$1" >&2; usage 1 ;;
  esac
done

if [ ! -f "$PROMPT_FILE" ]; then
  cat >&2 <<EOF
找不到任务提示词：$PROMPT_FILE

新建一个，写清任务目标、验收条件、以及不能碰的东西。例如：

    # 任务：把 Hot100 速记里所有代码块补上复杂度注释
    #
    # 验收：每个代码块下方都有一行「时间 O(...)，空间 O(...)」
    # 约束：不改动题目描述，不新增文件

然后重新运行 Tools/ralph.sh
EOF
  exit 1
fi

mkdir -p "$(dirname "$STATE_FILE")" "$LOG_DIR"
if [ ! -f "$STATE_FILE" ]; then
  printf '# Ralph 进度\n\n每轮由 Agent 更新。出现 `%s` 表示任务完成。\n' "$DONE_MARKER" >"$STATE_FILE"
fi

TASK=$(cat "$PROMPT_FILE")
FULL_PROMPT="$TASK

本轮的工作流程：
1. 先读 $STATE_FILE，了解前几轮做了什么、卡在哪里、下一步是什么。
2. 只推进一个明确的步骤，并验证这一步的结果。
3. 更新 $STATE_FILE：写清本轮完成了什么、失败原因、下一步做什么、证据在哪个文件。
4. 整个任务完成时，在 $STATE_FILE 里单独写一行：$DONE_MARKER

不要试图一轮做完全部内容。遇到无法自行解决的问题，把问题写进 $STATE_FILE 后停止。"

if [ "$DRY_RUN" = 1 ]; then
  echo "== 即将执行的命令 =="
  printf '  %q' "${AGENT[@]}"; echo " <提示词>"
  echo
  echo "== 提示词（每轮都会发送这份内容）=="
  echo "$FULL_PROMPT"
  echo
  echo "== 计划 =="
  echo "  最多 $MAX_ROUNDS 轮，状态文件 $STATE_FILE，日志目录 $LOG_DIR"
  exit 0
fi

echo "Ralph Loop 开始：最多 $MAX_ROUNDS 轮，状态文件 $STATE_FILE"
echo "每轮都会调用模型并消耗 Token。中断请按 Ctrl+C。"
echo

round=0
stale=0
prev_hash=""

snapshot() {
  { git status --porcelain 2>/dev/null || true; cat "$STATE_FILE" 2>/dev/null || true; } |
    shasum -a 256 | cut -c1-12
}

while :; do
  if [ "$round" -ge "$MAX_ROUNDS" ]; then
    echo "已到轮数上限 $MAX_ROUNDS，停止。请看 $STATE_FILE 判断下一步。" >&2
    exit 2
  fi

  round=$((round + 1))
  log="$LOG_DIR/round-$(printf '%02d' "$round").log"
  echo "── 第 $round 轮 ──"

  if ! "${AGENT[@]}" "$FULL_PROMPT" 2>&1 | tee "$log"; then
    echo "第 $round 轮失败，停止。日志：$log" >&2
    exit 3
  fi

  if grep -qE "^[[:space:]]*${DONE_MARKER}[[:space:]]*$" "$STATE_FILE"; then
    echo
    echo "任务完成（第 $round 轮）。状态文件：$STATE_FILE"
    exit 0
  fi

  hash=$(snapshot)
  if [ "$hash" = "$prev_hash" ]; then
    stale=$((stale + 1))
  else
    stale=0
  fi
  prev_hash="$hash"

  if [ "$stale" -ge 2 ]; then
    echo >&2
    echo "连续两轮没有任何变化，停止。" >&2
    echo "这通常说明问题不在实现，而在任务表述、工具或架构。请看 $log 和 $STATE_FILE。" >&2
    exit 4
  fi
done
