# HyperFrames 安装与搭建指南

> 本文记录**在这台机器（WSL2 / Ubuntu 26.04）上把 HyperFrames 装起来、并完整跑通一次
> "HTML → 视频"项目**的全过程。所有命令都实测过。
>
> 配套文档：[`HYPERFRAMES.md`](./HYPERFRAMES.md)（日常命令与故障排查速查）、
> [`CLAUDE.md`](./CLAUDE.md)（给 agent 的项目约定）。
> 官方完整参考在 `~/.claude/skills/hyperframes*/`，离线可查：`npx hyperframes docs <topic>`。

---

## 0. 全流程一览

```
系统依赖 (ffmpeg / chrome / espeak-ng)
      ↓
Python venv (torch / transformers / kokoro-onnx)  +  export HYPERFRAMES_PYTHON
      ↓
AI 编码技能包 skills（hyperframes / hyperframes-cli / hyperframes-registry / media-use）
      ↓
init 项目  →  add registry 组件  →  做音乐  →  写场景
      ↓
lint → check --json → snapshot → preview → render → ffprobe 验收
```

---

## 1. 前置：Node.js

HyperFrames CLI 要求 **Node.js 22+**。

```bash
node -v        # 本机实测：v24.21.0
npm -v         # 本机实测：11.19.0
```

所有命令都通过 `npx hyperframes <command>` 调用，不需要全局安装。

---

## 2. 系统依赖

| 组件 | 作用 | 装法 | 本机实测 |
|---|---|---|---|
| FFmpeg / FFprobe | 抽帧、编码、验收 | `sudo apt install ffmpeg` | 8.0.1-3ubuntu2，`/usr/bin/` |
| espeak-ng | 非英文 TTS 的音素化 | `sudo apt install espeak-ng` | 1.52.0 |
| Chrome Headless Shell | 渲染用的浏览器内核 | `npx hyperframes browser ensure` | `~/.cache/hyperframes/chrome/` |
| Docker（可选） | `--docker` 可复现容器渲染 | `sudo apt install docker.io` | 29.8.1，运行中 |

Chrome 缺依赖时（典型报错是缺 `libnss3` / `libnspr4`）：

```bash
sudo apt install -y libnss3 libnspr4
npx hyperframes browser ensure
```

验证：`npx hyperframes doctor --json`，**注意 `doctor` 永远 exit 0，要看 JSON 里的 `.ok` 字段**。

---

## 3. Python 侧（Kokoro TTS / MusicGen BGM）

Kokoro TTS 和 MusicGen BGM 跑在 Python 上。本机用 **uv 虚拟环境**装在仓库内的 `.venv/`：

```bash
cd /home/cooper/github/my--playground
uv venv .venv                                     # Python 3.13
uv pip install --python .venv/bin/python \
    torch --index-url https://download.pytorch.org/whl/cpu \
    transformers numpy soundfile kokoro-onnx
```

装完的关键包（本机实测版本）：

| 包 | 版本 | 用途 |
|---|---|---|
| `torch` | 2.15.0+cpu | MusicGen BGM（**必须 CPU 版**，否则会拉 ~2GB CUDA 依赖） |
| `transformers` | 5.22.2 | MusicGen BGM |
| `numpy` | 2.5.4 | Kokoro TTS + MusicGen + 本地音频合成 |
| `soundfile` | 0.14.0 | 读写 wav |
| `kokoro-onnx` | 0.6.1 | Kokoro TTS（本地语音合成，onnxruntime 1.31.1） |

`.venv/` 已在 `.gitignore` 里，不要提交。

### 3.1 ⚠️ 必须 export `HYPERFRAMES_PYTHON`

**这是本机唯一会让你"以为装好了其实没生效"的坑。**

HyperFrames 找 Python 的顺序是：`HYPERFRAMES_PYTHON` 环境变量 → `PATH` 上的 `python3` / `python`。
不设它，CLI 找不到 venv，后果是**静默降级**：`doctor` 把 Kokoro / MusicGen 报成 "Not installed"，
真正调用时也不会给出明确原因。

```bash
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"
```

持久化写进 `~/.bashrc`：

```bash
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"
```

验证：

```bash
HYPERFRAMES_PYTHON=/home/cooper/github/my--playground/.venv/bin/python npx hyperframes doctor
```

---

## 4. 安装 AI 编码技能包（skills）

HyperFrames 把"怎么写视频"编码成一组给 agent 读的 skills：

```bash
npx hyperframes skills          # 一次性安装 / 更新技能包
npx hyperframes skills update   # 刷新已装技能
```

装好后出现在 `~/.claude/skills/`：

| 技能 | 负责 |
|---|---|
| `hyperframes` | 视频创作规范、渲染契约、各类影片该有什么 |
| `hyperframes-cli` | 命令怎么跑、JSON 怎么读、失败了怎么救 |
| `hyperframes-registry` | 450+ 现成组件（转场、字幕、图表、3D…），装进来即可改 |
| `media-use` | 音乐、音效、配音、图片、去背景、调色 |
| `slideshow` / `figma` / `remotion-to-hyperframes` / `reverse-any-video` … | 其他工作流 |

> **⚠️ 网络坑**：`raw.githubusercontent.com` 在本机不通，`npx hyperframes skills update` 会在
> 校验 manifest 时失败。实际安装走 git clone（`github.com` 可达），所以**指定 skill 名字即可绕过**：
>
> ```bash
> npx hyperframes skills update hyperframes hyperframes-registry media-use
> ```
>
> 本仓库也做了软链：`.claude/skills/hyperframes-cli -> ../../.agents/skills/hyperframes-cli`。

---

## 5. 新建项目

```bash
npx hyperframes init my-video --skip-skills --skill=hyperframes --non-interactive
```

| 参数 | 说明 |
|---|---|
| `--skip-skills` | **永远带上**。不加的话 `init` 会顺手安装缺失的核心技能，而技能安装是"人"的一步，不该由 agent 代劳 |
| `--skill=hyperframes` | 记录归属技能，后续每次渲染都归到这个技能的用量统计 |
| `--non-interactive` | CI / agent 场景强制 flag-only，跳过交互式向导 |
| `--resolution` | 预设分辨率，默认 `landscape` = 1920×1080 |
| `--example <name>` | 从命名模板起步（`blank` / `product-promo` / `kinetic-type` …），**仅在被要求时用** |

生成的结构：

```
my-video/
├── index.html            # 根合成：声明变量、挂载场景、放媒体与音频
├── compositions/         # 子合成，一个场景一个文件
├── assets/               # 媒体与字体
├── hyperframes.json      # 路径与媒体策略
├── package.json          # npm run dev / check / render
└── meta.json
```

---

## 6. 往项目里装现成组件（registry）

**动手写任何具名效果之前先搜 registry。**

```bash
# 搜索（本地索引，不联网）
npx hyperframes catalog --query "three feature cards with icons" --json

# 安装（--dir 必填，否则装到当前工作目录！）
npx hyperframes add grid-card-assemble --dir=/abs/path/to/my-video --no-clipboard --json
```

- `catalog` 只在英文索引里搜，**用英文描述"这一拍要做什么"**，别用项目名。
- `add` 可以一次给多个名字：`npx hyperframes add a b c --dir=...`。
- 装出来的文件分两类：
  - **block** → `compositions/<name>.html`，自带 `<template>`，用 `data-composition-src` 挂载；
  - **component** → `compositions/components/<name>.html`，是把标记/CSS/JS 抄进你自己的场景里。
- **装完就是普通源码**，直接改。

---

## 7. 背景音乐

### 路线 A：HeyGen 音乐库（音质最好，需要登录）

```bash
npx hyperframes auth login      # 免费账号即可
npx hyperframes auth status
```

登录后可直接检索 10k+ 曲库：

```bash
npx hyperframes media-use resolve --type bgm --intent "light ambient corporate bed" --project my-video
```

### 路线 B：本地 MusicGen（本机走不通，见下）

理论上 `npx hyperframes` 的音频引擎在没有 HeyGen 凭据时会自动退回本地 MusicGen，
模型是 `facebook/musicgen-small`。

> **⚠️ 本机实测失败**：`huggingface.co` 网络不可达，权重下不下来：
>
> ```
> [Errno 101] Network is unreachable ... huggingface.co/facebook/musicgen-small/resolve/main/processor_config.json
> ```
>
> `doctor` 依然显示 "✓ BGM (MusicGen) MusicGen deps installed"——因为它只检查**依赖包**在不在，
> 不检查**权重**能不能下载。所以"doctor 绿了"≠"MusicGen 能用"。
>
> （`hf-mirror.com` 这类镜像可以通，但要走外部镜像下载模型，需要单独授权。）

### 路线 C：numpy 本地合成（本机本次采用，零外部依赖）

既然 MusicGen 走不通，就用已装好的 `numpy` + `soundfile` 自己合成一段音乐床——
4 小节 I–V–vi–IV（C 大调）、100 BPM，包含 pad 垫底、柔和电钢式琶音、根音 bass 和一层空气感噪声，
末端做低通柔化和淡入淡出。完全确定性（固定随机种子），改常量即可换和弦/速度/音色。

参考实现见本仓库的 [`product-intro/tools/make_bgm.py`](./product-intro/tools/make_bgm.py)（见 §10 的重建说明）。

```bash
python tools/make_bgm.py                                   # → assets/audio/bgm.wav
ffmpeg -i assets/audio/bgm.wav -c:a libmp3lame -b:a 192k assets/audio/bgm.mp3
```

放到项目里时，音频元素要**有 id**、**不能有 `crossorigin`**：

```html
<audio id="bgm" src="assets/audio/bgm.mp3"
       data-start="0" data-duration="10" data-track-index="4" data-volume="0.9"></audio>
```

---

## 8. 写场景时的几个硬规则（踩过才知道）

### 8.1 变量作用域是**隔离**的，根变量不会自动下沉到子合成

每个合成有自己的变量表；子合成里 `window.__hyperframes.getVariables()` 只会拿到
**它自己声明的默认值 + 宿主上的 `data-variable-values`**，拿不到根合成的变量。

想要"文案只有一处"，就在根合成的脚本里、**挂载前**把根变量的值写进各宿主的 `data-variable-values`：

```html
<script>
  (function () {
    var vars = {};
    var declared = JSON.parse(
      document.documentElement.getAttribute("data-composition-variables") || "[]"
    );
    declared.forEach(function (e) { if (e && typeof e.id === "string") vars[e.id] = e.default; });
    Object.assign(vars, window.__hfVariables || {});   // CLI --variables 覆盖优先级最高

    function pass(hostId, values) {
      var host = document.getElementById(hostId);
      if (host) host.setAttribute("data-variable-values", JSON.stringify(values));
    }
    pass("features", { items: vars.features });
  })();
</script>
```

### 8.2 子合成里用 `id="root"` 是安全的

运行时会给子合成做作用域隔离：子合成脚本里的 `document.getElementById("root")`、
`document.querySelector(...)`、GSAP 的字符串选择器，都会被**重写/过滤到本场景内**。
所以每个场景文件都可以照惯例写 `<div id="root" data-composition-id="...">`。

### 8.3 根合成只放场景宿主

`lint` 规则 `nested_structure_needs_subcomposition`：根合成里的元素如果还嵌着子元素，
会被要求拆成子合成文件。**连全屏背景也要做成一个子合成**（`compositions/background.html`）。

### 8.4 时间线契约

- 每个"有戏"的元素都要 `class="clip"` + `data-start` + `data-duration`（秒）。
- 片段显示区间是 `[start, start+duration)`，**结束状态要落在区间内**，否则最后一帧看不到。
- 影片总长 = 根的 `data-duration`，**没有任何命令能改它**，只能手改 HTML。
- 每个合成注册一条**暂停**的根时间线：`window.__timelines["<composition-id>"] = tl`。
- 场景内部用 `fromTo`（不要用 `from`），宿主每次重播都会重新 seek，`from` 会漂。
- 不要 `tl.add()` 把子合成时间线塞进根时间线。

---

## 9. 标准工作流

```bash
cd my-video
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"

npx hyperframes lint                        # 写完第一版就 lint
npx hyperframes check --json                # 验收闸门（lint+runtime+layout+contrast+craft+audio）
npx hyperframes snapshot --at 1,3,5         # 抽帧成 PNG，自己看
npx hyperframes preview --background        # 起预览，给 URL 给人看
npx hyperframes render --quality delivery -o out/x.mp4
```

### 9.1 验收清单（不要只信 `check` 通过）

```bash
ffprobe -v error -show_entries format=duration,size \
        -show_entries stream=codec_type,codec_name,width,height,r_frame_rate \
        -of default=nw=1 out/x.mp4
# 期望：h264 1920x1080 30/1 + aac，duration == 根的 data-duration

ffmpeg -i out/x.mp4 -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
# 期望：mean_volume 不是 -91 dB（全静音）

ffmpeg -ss 8.6 -i out/x.mp4 -frames:v 1 /tmp/frame.png   # 解码出来看一眼
```

### 9.2 渲染耗时参考

10 秒 1080p 片子，本机（软件 GPU）约 **1 分钟**（compile 40s + capture 17s + encode 17s）。
30 秒以内的片子直接前台跑，不用脱离。

---

## 10. 本次实录的踩坑清单

| 现象 | 原因 | 处理 |
|---|---|---|
| `npx hyperframes add` 装到了仓库根目录 | `add` 默认装到 **当前工作目录**，不认项目 | 永远带 `--dir=<项目绝对路径>` |
| `doctor` 说 MusicGen 装好了，但生成音乐直接失败 | `doctor` 只查依赖包，不查权重能否下载 | 见 §7 路线 B，用 `tools/make_bgm.py` 兜底 |
| `huggingface.co` 网络不可达 | 本机出网限制 | 只能走镜像（需授权）或本地合成 |
| `nested_structure_needs_subcomposition` 警告 | 根合成里直接嵌套了 `<div>` | 把背景等拆成 `compositions/background.html` |
| `studio_missing_editable_id` 警告 | 时间线上可见元素没有稳定 id | 给每个 clip 加语义化 id |
| `container_overflow`（info） | 装饰性元素被平移出容器 | 给它加 `data-layout-allow-overflow` |
| `first_frame_empty`（craft 警告） | 第 0 帧只有背景——社交平台封面会是空的 | 让标题在第 0 帧就有可见状态（例如起始不透明度 0.25 而不是 0），仍然是"淡入" |
| `line_unread`（craft 警告） | 最后一行只停留了 1.7 秒，不足 2 秒 | 提前该行的入场时间，或把该场景拉长 |
| registry 自带图标和文案对不上 | block 的六个通用图形是按序号轮换的 | 用 block 支持的 **slotted content**：自己写卡片放进 `[data-slot="items"]`，文字仍由变量驱动 |
| 中文渲染成方块 | bundled 字体没有 CJK 字形 | 字体栈里加 `"Noto Sans JP"`（自带汉字字形）兜底；注意它与思源黑体的字形有细微差异 |
| `--variables` 只对根合成生效 | 变量作用域隔离 | 见 §8.1 |

---

## 11. 文件与目录清单（本次搭建产物）

```
my--playground/
├── HYPERFRAMES.md              # 日常命令与故障排查速查
├── HYPERFRAMES-INSTALL.md      # ← 本文：安装与搭建
├── CLAUDE.md                   # 给 agent 的项目约定
├── .venv/                      # Python 依赖（Kokoro / MusicGen / numpy），已 gitignore
└── product-intro/              # 示例项目（10 秒产品介绍片）
    ├── index.html              # 根合成：变量声明、场景宿主、音频
    ├── compositions/
    │   ├── background.html      # 深色渐变背景（0-10s 常驻）
    │   ├── brand.html           # 0-3s  公司名从下方淡入
    │   └── components/
    │       ├── grid-card-assemble.html   # 3-7s  三个特点卡片（自带图标）
    │       └── cta-lockup.html           # 7-10s CTA 按钮
    ├── assets/audio/bgm.mp3     # 轻音乐床（本地合成）
    ├── tools/make_bgm.py        # 音乐合成脚本，可改和弦/速度/音色后重生成
    └── out/product-intro.mp4    # 成片
```

---

## 12. 相关文档

| 想查什么 | 去哪 |
|---|---|
| 常用命令 / 渲染参数 / 故障排查表 | [`HYPERFRAMES.md`](./HYPERFRAMES.md) |
| 离线查 CLI 内置文档 | `npx hyperframes docs <topic>`（`data-attributes` / `gsap` / `compositions` / `rendering` / `audio` / `troubleshooting`） |
| 官方技能包全文 | `~/.claude/skills/hyperframes*/references/` |
| 想做视频时的创作规范 | `/hyperframes` 技能 |
| 命令怎么用、报错怎么救 | `/hyperframes-cli` 技能 |
| 现成组件库 | `/hyperframes-registry` 技能 |
| 素材与音频 | `/media-use` 技能 |
