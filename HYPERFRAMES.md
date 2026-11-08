# HyperFrames 使用指南

本仓库用 [HyperFrames](https://hyperframes.heygen.com) 把 HTML/CSS + GSAP 动画渲染成视频。
CLI 版本 `0.9.23`，运行环境 WSL2 / Ubuntu 26.04。

> 配套文档：项目根目录的 [`CLAUDE.md`](./CLAUDE.md)（给 agent 看的速查）、
> [`HYPERFRAMES-INSTALL.md`](./HYPERFRAMES-INSTALL.md)（安装与搭建全流程、踩坑表）、
> `~/.claude/skills/hyperframes*/`（官方完整参考，`npx hyperframes docs <topic>` 可离线查）。

---

## 0. 三分钟上手

```bash
cd <项目目录>
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"

npx hyperframes lint          # 静态检查
npx hyperframes check --json  # 完整校验（lint + runtime + layout + contrast + craft + audio）
npx hyperframes snapshot --at 1,3,5   # 抽帧成 PNG，自己看一眼
npx hyperframes render --quality looks -o out.mp4      # 出片
```

新项目：`npx hyperframes init my-video --skip-skills --non-interactive`

---

## 1. ⚠️ 必须设 `HYPERFRAMES_PYTHON`

**这是本机唯一会让你"以为装好了其实没生效"的坑。**

Kokoro TTS / MusicGen BGM 依赖装在项目内的 uv 虚拟环境里，不在 `PATH` 上。
HyperFrames 查找 Python 的顺序是：

1. `HYPERFRAMES_PYTHON` 环境变量 ← **优先级最高**
2. `PATH` 上的 `python3` / `python`

不设这个变量，CLI 找不到 venv。后果是**静默降级**：`doctor` 把 Kokoro / MusicGen 报成
"Not installed"，实际调用 `tts` 时会直接失败而不是给出明确原因。

对照实验（本机实测）：

```
$ npx hyperframes doctor
  ✗ TTS (Kokoro)     Not installed
  ✗ BGM (MusicGen)   Not installed

$ HYPERFRAMES_PYTHON=/home/cooper/github/my--playground/.venv/bin/python npx hyperframes doctor
  ✓ TTS (Kokoro)     Kokoro deps installed
  ✓ BGM (MusicGen)   MusicGen deps installed
```

**日常用法**：每开一个新终端就 export 一次，或者把下面这行写进 `~/.bashrc`：

```bash
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"
```

---

## 2. 常用命令

### 2.1 建项目 / 看项目

| 命令 | 说明 |
|---|---|
| `npx hyperframes init <dir> --skip-skills --non-interactive` | 生成空项目（**始终带 `--skip-skills`**，否则会尝试联网装 skill） |
| `npx hyperframes info` | 打印项目元信息 |
| `npx hyperframes compositions` | 列出项目里所有 composition |
| `npx hyperframes timeline --json` | 列出所有 clip 的绝对时间、归属文件、`#id` |
| `npx hyperframes docs <topic>` | 离线看文档（`data-attributes` / `gsap` / `rendering` / `audio` / `troubleshooting` / `compositions` / `motion-blur` / `transcribe` / `examples`） |

### 2.2 检查（写完必做）

| 命令 | 说明 |
|---|---|
| `npx hyperframes lint` | 静态检查，**改完 HTML 立刻跑** |
| `npx hyperframes check --json` | **总闸**：lint + runtime + layout + contrast + craft + audio。`ok: true` 才算过 |
| `npx hyperframes lint --verbose` | 含 info 级提示 |
| `npx hyperframes lint --json` | CI 用 |

> `check` 的坑：**还有 lint error 时，layout / contrast 审计根本不会跑**，
> 报 "0 samples" 不代表检查通过——先把 error 清干净。

### 2.3 看效果（出片前必做）

| 命令 | 说明 |
|---|---|
| `npx hyperframes snapshot --at 1,5,9` | 抽帧成 PNG（存 `.hyperframes/artifacts/snapshots/`） |
| `npx hyperframes snapshot --range 2,6` | 抽一段时间区间 |
| `npx hyperframes snapshot --composition <id>` | 抽子 composition |
| `npx hyperframes preview --background` | 起 Studio 编辑器（**agent 环境必须用 `--background`**） |
| `npx hyperframes preview --status` | 确认服务在跑 |
| `npx hyperframes preview --stop` | 停服务 |
| `npx hyperframes keyframes` | 关键帧 / onion-shot 诊断 |
| `npx hyperframes compare` / `grade-compare` | 多版本对比图、调色对比图 |
| `npx hyperframes audio` | 测声音落点、响度、静音区间 |

> `check` 通过 ≠ 好看。**必须 `snapshot` 抽帧自己看 PNG**，这是唯一能"看到"视频的方式。

### 2.4 渲染

| 命令 | 说明 |
|---|---|
| `npx hyperframes render --quality looks -o out.mp4` | 默认质量（CRF 16），日常用这个 |
| `npx hyperframes render --quality draft -o out.mp4` | 迭代时用，快 |
| `npx hyperframes render --quality delivery -o out.mp4` | 终版（等于 `high`） |
| `npx hyperframes render --fps 60 --quality delivery -o out.mp4` | 60fps，渲染时间翻倍 |
| `npx hyperframes render --docker --strict -o out.mp4` | 容器内渲染，跨机器字节一致 |
| `npx hyperframes render --format webm -o out.webm` | 透明通道 WebM |
| `npx hyperframes render --format gif --fps 15 -o out.gif` | GIF（fps ≤ 30，无音轨） |

**渲染后必做三项核验**（CLI 不会替你做）：

```bash
ls -l out.mp4                                  # 1. 非空
ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4
                                               # 2. 时长 == 根节点 data-duration
ffmpeg -v error -y -ss 5 -i out.mp4 -frames:v 1 /tmp/f.png   # 3. 抽帧看内容
```

### 2.5 本地媒体（不需要 API key、不联网）

| 命令 | 说明 |
|---|---|
| `npx hyperframes tts "文本" -v zf_xiaobei -o speech.wav` | 本地 Kokoro-82M 语音合成 |
| `npx hyperframes tts --list` | 列出全部音色 |
| `npx hyperframes transcribe audio.mp3` | 转录成 `transcript.json`（首次会现场编译 whisper.cpp，很慢） |
| `npx hyperframes remove-background in.mp4 -o out.mov` | 去背景，出透明通道 |
| `npx hyperframes beats` | 分析音乐节拍，写 `beats/*.json`（需要 ffmpeg） |
| `npx hyperframes normalize-audio` | 对齐两段音频的响度（LUFS） |

**Kokoro 音色**：`af_heart`（女）/ `am_adam`（男）/ `bf_emma`（英女）/
`ef_dora`（西）/ `ff_siwis`（法）/ `jf_alpha`（日）/ **`zf_xiaobei`（中文女）**。
共 54 个，完整列表见 https://github.com/thewh1teagle/kokoro-onnx 。

首次调用 `tts` 会自动从 GitHub Releases 下载模型（约 311MB）到本地缓存。

### 2.6 编辑时间线

```bash
npx hyperframes timeline --json                    # 先看 clip 和 #id
npx hyperframes timeline move #intro --start 3 --plan --json   # 先预览
npx hyperframes timeline move #intro --start 3             # 再执行
npx hyperframes timeline trim|split|set|duplicate|delete <ref> ...
```

批量改用 JSON 文件：

```json
[{"verb": "move", "ref": "#outro", "time": "9"}]
```

```bash
npx hyperframes timeline apply plan.json --json   # 会打印一个 receipt
npx hyperframes timeline undo receipt.json        # 后悔了用它回滚
```

### 2.7 部署 / 发布

| 命令 | 说明 |
|---|---|
| `npx hyperframes publish` | 上传到稳定 URL（默认私有，需 `npx hyperframes auth login`） |
| `npx hyperframes publish --public` | 公开 |
| `npx hyperframes cloud render ...` | 云端渲染，**不需要本地 Chrome/FFmpeg** |
| `npx hyperframes lambda render` / `cloudrun render` | 自己的 AWS / GCP |

### 2.8 运维

| 命令 | 说明 |
|---|---|
| `npx hyperframes doctor` | 环境自检（**每次怀疑环境有问题时先跑这个**） |
| `npx hyperframes browser ensure` | 下载/修复 Chrome Headless Shell |
| `npx hyperframes browser path` | 打印 Chrome 可执行文件路径 |
| `npx hyperframes update` | CLI + skills 一起检查更新 |
| `npx hyperframes clean --dry-run` / `clean` | 清理磁盘占用（**永远不要删 `.hyperframes`**，历史在那儿） |
| `npx hyperframes upgrade` | 版本升级指引 |

---

## 3. 标准工作流

```
init  →  写 HTML/GSAP  →  lint  →  check --json  →  snapshot（看图）
      →  preview（人审）  →  render  →  ffprobe/抽帧核验
```

每写完或结构性改完就跑一次 `lint`；出片前必须 `check` + `snapshot`。

**不要跳过 snapshot。** `check` 全绿只说明"没有明显错误"，不代表画面好看——
空模板里没有主视觉这种问题，只有看图才发现得了。

---

## 4. 本机环境现状（2026-11-08 实测）

| 组件 | 状态 |
|---|---|
| Node.js | v24.21.0（要求 ≥22）✓ |
| FFmpeg / FFprobe | 8.0.1-3ubuntu2，`/usr/bin/` ✓ |
| Chrome Headless Shell | 152.0.7977.30，`~/.cache/hyperframes/chrome/` ✓ |
| espeak-ng | `/usr/bin/espeak-ng` ✓（非英文 TTS 音素化必需） |
| Docker | 29.8.1，运行中 ✓ |
| uv venv | `/home/cooper/github/my--playground/.venv`，Python 3.13.15 ✓ |
| └ torch | 2.15.0+**cpu**（刻意用 CPU 版，省 ~2GB CUDA 依赖） |
| └ transformers / numpy / soundfile / kokoro-onnx | ✓ |
| whisper-cpp | ✗ 首次 `transcribe` 时现场编译（`git cmake build-essential` 已装） |
| GPU | ✗ WSL 下无硬件 GPU 访问，走 SwiftShader 软件渲染 |

### venv 管理

```bash
uv venv .venv                                              # 创建
uv pip install --python .venv/bin/python <packages>       # 安装
```

`.venv/` 已在 `.gitignore` 中。

---

## 5. 注意事项 / 踩过的坑

### 5.1 WSL 是软件渲染

CLI 探测到当前用户无法读写 `/dev/dri/renderD128`，也不在 `render` 组里，
所以用 SwiftShader 软件 WebGL。

- 纯文字 / 简单 CSS 片子无感（本机 10s / 300 帧只用了 **3.7 秒**）
- 遇到 shader / WebGL / 复杂动效会明显变慢

想用上 GPU：

```bash
sudo usermod -aG render $USER    # 然后在 Windows 侧执行 wsl --shutdown 再重开 WSL
```

渲染摘要第二行会写明走的是哪条路：`beginframe capture`（正常）还是
`screenshot capture · software gpu`（慢路径，Linux 上常见）。

### 5.2 `raw.githubusercontent.com` 在本机不通

`npx hyperframes skills update`（不带名字）会失败：

```
■  Update failed — can't check skills freshness (GitHub manifest unreachable)
```

因为它校验 manifest 走 `raw.githubusercontent.com`，而这个域名本机超时无响应
（`github.com` / `api.github.com` / jsdelivr 都通）。

**实际安装走的是 `git clone`（github.com 可达）**，所以指定 skill 名字即可绕过：

```bash
npx hyperframes skills update hyperframes hyperframes-registry media-use
```

已安装的 core skill：`hyperframes` / `hyperframes-cli` / `hyperframes-registry` / `media-use`
（全局 `~/.claude/skills/` 和 `~/.agents/skills/`）。

### 5.3 Ubuntu 26.04 的包名变了

`libasound2` 等一批包改成了 `t64` 后缀（`libasound2t64` / `libatk1.0-0t64` / `libcups2t64` / `libatspi2.0-0t64`），
旧名变成虚拟包，apt 遇到没候选的虚拟包会**整条中止、一个包都不装**。

补 Chrome 依赖时用这条（已实测最小可用集）：

```bash
sudo apt-get install -y libnss3 libnspr4
```

### 5.4 命令必须在项目目录里跑

CLI 默认以 **cwd** 为项目根。仓库根目录没有 `index.html`，在错误目录跑会报：

```
✗  No composition found in /home/cooper/github/my--playground
```

每次命令前 `cd` 到项目目录（或给 `render` 传目录位置参数）。

### 5.5 `--skip-skills` 永远带上

`init` 默认会尝试安装缺失的 core skill，遇到上面 5.2 的问题就会卡住/失败。
`init --skip-skills`（或 `HYPERFRAMES_SKIP_SKILLS=1`）跳过这一步。

### 5.6 别删 `.hyperframes/`

项目历史（`npx hyperframes history`）和 check / snapshot 产物都在 `.hyperframes/` 里。
清理用 `npx hyperframes clean`，不要手动 `rm -rf`。

### 5.7 渲染的坑位

- clip 之间**不允许重叠**（要 `--overwrite` 或先挪邻居）
- clip 不能超出所属 composition 的时长；改不了根节点的 `data-duration`
- 默认输出是带时间戳的 `renders/<project>_<时间戳>.mp4`，想固定名字要自己传 `-o`

---

## 6. 故障排查

| 症状 | 原因 / 处理 |
|---|---|
| doctor 报 TTS/BGM "Not installed" 但确实装了 | 漏了 `HYPERFRAMES_PYTHON`（见 §1） |
| render 报 Chrome 缺共享库 | `sudo apt-get install -y libnss3 libnspr4` |
| doctor 报 FFmpeg 缺失 | `sudo apt-get install -y ffmpeg`（会带出 ffprobe） |
| check 报 "0 samples" | 还有 lint error 没清，layout/contrast 根本没跑 |
| render 报 Chrome 启动即退 | WSL/沙箱限制；改用 `render --docker` 或 `cloud render` |
| `skills update` 报 manifest unreachable | 见 §5.2，指定 skill 名字 |
| apt 报 `Package 'libasound2' has no installation candidate` | 见 §5.3，改用 `t64` 后缀包名 |
| 画面全黑 / 只有背景色 | 主视觉没挂上——`snapshot` 抽帧确认 |
| 中文 TTS 发音异常 | 确认 `espeak-ng` 已装（`which espeak-ng`） |

---

## 7. 相关文件

```
my--playground/
├── CLAUDE.md              # agent 速查（含 HYPERFRAMES_PYTHON 说明）
├── HYPERFRAMES.md         # 本文档
├── .gitignore             # 含 .venv/、.hyperframes/、媒体产物
├── .venv/                 # uv 虚拟环境（Kokoro / MusicGen 依赖）
└── hf-e2e/                # 端到端验证用的空项目（可作模板参考）
```

官方文档：https://hyperframes.heygen.com/llms.txt
