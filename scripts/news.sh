#!/usr/bin/env bash
# news.sh — 取腾讯新闻 → 写入项目根 hot-news.json → 打开本地页面
#
#   sh scripts/news.sh <关键词> [条数]
#   sh scripts/news.sh 美国中期选举 15
#
# 写成 POSIX sh 兼容（dash / bash 都能跑）。所有路径都由脚本自身位置推导成
# 绝对路径，与调用时的 cwd 无关：publish-hot.py 的输出路径是相对 cwd 解析的，
# 直接在任意目录调用它会把 hot-news.json 写到错误的目录，这里用 --out 钉死
# 在项目根。

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS="$ROOT/.claude/skills/tencent-news/scripts"

KEYWORD="${1:-}"
LIMIT="${2:-15}"

if [ -z "$KEYWORD" ]; then
  echo "用法: sh scripts/news.sh <关键词> [条数, 默认 15]" >&2
  exit 1
fi

for f in run-cli.sh publish-hot.py open-page.sh; do
  [ -f "$SCRIPTS/$f" ] || { echo "找不到技能脚本: $SCRIPTS/$f" >&2; exit 1; }
done

echo "news: 搜索「$KEYWORD」，取 $LIMIT 条"

sh "$SCRIPTS/run-cli.sh" search "$KEYWORD" --limit "$LIMIT" \
  | python3 "$SCRIPTS/publish-hot.py" --out "$ROOT/hot-news.json"

if [ -f "$ROOT/hot-news.html" ]; then
  sh "$SCRIPTS/open-page.sh" "$ROOT/hot-news.html" "$ROOT"
else
  echo "news: 没有找到 hot-news.html，只更新了数据" >&2
fi
