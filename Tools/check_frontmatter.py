#!/usr/bin/env python3
"""检查笔记 YAML frontmatter 是否符合 AGENTS.md 的元数据规则。

规则来源：仓库根目录 AGENTS.md「元数据」一节。
用法：
    python3 Tools/check_frontmatter.py [file ...]
不传参数时，检查 git 已暂存的 .md 文件；传参数时只检查给定文件。
退出码非 0 表示有错误，可直接接到 pre-commit 里。
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("缺少依赖：pip install pyyaml", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ALLOWED_TYPE = {"notes", "thoughts"}

# Learning/ 是学习画像，不受发布字段约束；_Templates/ 含占位符，不是真实文档
EXEMPT_DIRS = {"Learning", "_Templates"}


def is_exempt(path: Path) -> bool:
    try:
        rel = path.relative_to(REPO_ROOT)
    except ValueError:
        rel = path
    return rel.parts and rel.parts[0] in EXEMPT_DIRS


def staged_md_files() -> list[Path]:
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=REPO_ROOT, capture_output=True, text=True, check=True,
    ).stdout
    return [REPO_ROOT / p for p in out.splitlines() if p.endswith(".md")]


def load_frontmatter(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    try:
        data = yaml.safe_load(m.group(1))
    except yaml.YAMLError:
        return {}  # 解析失败时跳过，不当作检查失败（避免误伤模板之外偶发的写法）
    return data if isinstance(data, dict) else {}


def check_non_empty_strings(value, field: str, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, list):
        errors.append(f"{field} 应为数组")
        return
    for item in value:
        if not isinstance(item, str) or not item.strip():
            errors.append(f"{field} 的元素须为非空字符串，发现：{item!r}")


def check_file(path: Path, fm: dict, slug_index: dict[str, Path]) -> list[str]:
    errors: list[str] = []

    draft = fm.get("draft")
    if draft is not None and not isinstance(draft, bool):
        errors.append(f"draft 须为布尔值，发现：{draft!r}")

    is_draft = draft is True or draft is None  # 未写 draft 时按保守策略当草稿处理

    type_ = fm.get("type")
    if type_ is not None and type_ not in ALLOWED_TYPE:
        errors.append(f"type 须为 notes 或 thoughts，发现：{type_!r}")

    slug = fm.get("slug")
    if slug is not None:
        if not isinstance(slug, str) or not SLUG_RE.match(slug):
            errors.append(f"slug 须为小写字母、数字及词间单连字符，发现：{slug!r}")
        else:
            prev = slug_index.get(slug)
            if prev is not None and prev != path:
                errors.append(f"slug 重复，另一处：{prev.relative_to(REPO_ROOT)}")
            slug_index[slug] = path

    check_non_empty_strings(fm.get("categories"), "categories", errors)
    check_non_empty_strings(fm.get("tags"), "tags", errors)

    if draft is False:  # 仅公开文章要求必填字段
        for field in ("title", "type", "slug", "summary"):
            v = fm.get(field)
            if not isinstance(v, str) or not v.strip():
                errors.append(f"公开文章缺少非空的 {field}")
        date = fm.get("date")
        if date is None:
            errors.append("公开文章缺少 date")

    return errors


def build_slug_index(all_md_files: list[Path]) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for path in all_md_files:
        if is_exempt(path) or not path.exists():
            continue
        fm = load_frontmatter(path)
        if fm and isinstance(fm.get("slug"), str):
            index.setdefault(fm["slug"], path)
    return index


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--all":
        targets = [p for p in REPO_ROOT.rglob("*.md")]
    elif args:
        targets = [Path(a).resolve() for a in args]
    else:
        targets = staged_md_files()
    targets = [p for p in targets if not is_exempt(p)]
    if not targets:
        return 0

    all_md = list(REPO_ROOT.rglob("*.md"))
    slug_index = build_slug_index(all_md)
    # 允许本次改动覆盖索引里的旧 slug（比如改名场景），先清掉再按本次文件重建冲突判断
    for p in targets:
        for s, owner in list(slug_index.items()):
            if owner == p:
                del slug_index[s]

    had_error = False
    for path in targets:
        if not path.exists():
            continue
        fm = load_frontmatter(path)
        if fm is None:
            continue  # 没有 frontmatter 的文件不检查
        errors = check_file(path, fm, slug_index)
        if errors:
            had_error = True
            rel = path.relative_to(REPO_ROOT)
            print(f"✗ {rel}")
            for e in errors:
                print(f"  - {e}")

    if not had_error:
        print(f"frontmatter 检查通过（{len(targets)} 个文件）")
    return 1 if had_error else 0


if __name__ == "__main__":
    sys.exit(main())
