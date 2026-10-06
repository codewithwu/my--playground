#!/bin/sh
# open-page.sh — Serve the hot-news page locally and open it in Google Chrome.
#
# The page loads hot-news.json with fetch(), which browsers block on file://,
# so it has to be reached over http:// — this script starts a throwaway static
# server, opens Chrome, and leaves the server running for later refreshes.
#
#   sh scripts/open-page.sh [page.html] [serve-dir]
#
# Environment:
#   HOT_NEWS_PORT      port for the static server (default 8765)
#   HOT_NEWS_NO_OPEN   set to 1 to start the server without launching a browser

set -e

PAGE="${1:-hot-news.html}"
DIR="${2:-}"
PORT="${HOT_NEWS_PORT:-8765}"

fail() { echo "open-page: $1" >&2; exit 1; }

[ -f "$PAGE" ] || fail "找不到页面：$PAGE"

[ -n "$DIR" ] || DIR="$(cd "$(dirname "$PAGE")" && pwd)"
PAGE_NAME="$(basename "$PAGE")"
URL="http://localhost:$PORT/$PAGE_NAME"

serving() {
  [ "$(curl -fsS -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null)" = "200" ]
}

if ! serving; then
  command -v python3 >/dev/null 2>&1 || fail "需要 python3 来启动本地服务器"
  # Bind all interfaces: under WSL2 the Windows-side browser reaches the server
  # through localhost forwarding, which does not go through 127.0.0.1 only.
  nohup python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIR" \
    >/dev/null 2>&1 &
  i=0
  while [ "$i" -lt 30 ]; do
    serving && break
    i=$((i + 1))
    sleep 0.1
  done
  serving || fail "本地服务器启动失败：$URL"
fi

echo "open-page: $URL"

[ "${HOT_NEWS_NO_OPEN:-0}" = "1" ] && exit 0

open_chrome() {
  for bin in google-chrome google-chrome-stable chrome chromium chromium-browser; do
    path="$(command -v "$bin" 2>/dev/null || true)"
    if [ -n "$path" ]; then
      "$path" "$URL" >/dev/null 2>&1 &
      echo "open-page: 已用 $bin 打开"
      return 0
    fi
  done

  # WSL: no Linux browser, fall back to Chrome on the Windows side.
  for exe in \
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
    if [ -f "$exe" ]; then
      explorer.exe "$URL" >/dev/null 2>&1 &
      echo "open-page: 已用 Windows 版 Chrome 打开"
      return 0
    fi
  done

  if command -v explorer.exe >/dev/null 2>&1; then
    explorer.exe "$URL" >/dev/null 2>&1 &
    echo "open-page: 已用系统默认浏览器打开（未找到 Chrome）"
    return 0
  fi

  fail "没找到 Chrome，页面已在 $URL 上，直接访问即可"
}

open_chrome
