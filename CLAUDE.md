# my--playground

## 腾讯新闻取数：输出路径规则

新闻数据固定落在**项目根目录**的 `hot-news.json`，与 `hot-news.html` 同级，由本地静态服务器提供。

`publish-hot.py` 的输出路径是**相对当前工作目录**解析的（`--out` 默认取 `--dir`，而 `--dir` 默认是 `.`），
所以它的输出位置完全由调用时的 cwd 决定。本项目在 `settings.json` 里设了
`CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1`，每次 Bash 调用后 cwd 都会回到项目根目录。

因此：

- **正确**：在项目根目录执行，使用相对路径 `.claude/skills/tencent-news/scripts/...`，不要 `cd` 进技能目录。
- **错误**：先 `cd` 到 `.claude/skills/tencent-news` 再执行 `python3 scripts/publish-hot.py` —— cwd 变成技能目录，JSON 会落到技能目录里。

标准调用：

```bash
sh .claude/skills/tencent-news/scripts/run-cli.sh search "<关键词>" --limit 15 \
  | python3 .claude/skills/tencent-news/scripts/publish-hot.py
sh .claude/skills/tencent-news/scripts/open-page.sh hot-news.html
```

更省事的一条龙封装（内部全部用绝对路径推导，与 cwd 无关）：

```bash
sh scripts/news.sh "<关键词>" [条数]
```

### 其他注意

- `run-cli.sh`、`open-page.sh` 内部用 `dirname "$0"` 自解析位置，**不需要** cd 进去。
- `open-page.sh` 用 http:// 提供页面（浏览器在 `file://` 下会拦截 `fetch()`），服务器常驻 8765 端口，刷新即可看到最新数据。
- 技能目录下的第三方脚本由技能市场管理，**不要直接改**（更新时会被覆盖）。
