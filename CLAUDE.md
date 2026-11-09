# my--playground

个人实验场仓库：主要用来跑 HyperFrames（AI 视频合成 CLI）相关的项目。

完整使用手册（常用命令、渲染参数、故障排查表）见 [`HYPERFRAMES.md`](./HYPERFRAMES.md)。
安装与搭建全流程（依赖、venv、skills、registry 组件、验收清单、踩坑表）见 [`HYPERFRAMES-INSTALL.md`](./HYPERFRAMES-INSTALL.md)。

## HyperFrames CLI

所有命令通过 `npx hyperframes <command>` 调用。CLI 需要 Node.js 22+ 和 FFmpeg。

### ⚠️ 必须设置 `HYPERFRAMES_PYTHON`

本项目的本地 Python 依赖（Kokoro TTS / MusicGen BGM）装在项目内的 uv 虚拟环境里，**不在 PATH 上**。
HyperFrames 查找 Python 的顺序是：`HYPERFRAMES_PYTHON` 环境变量 → `PATH` 上的 `python3` / `python`。
不设这个变量，CLI 找不到 venv，`doctor` 会把 Kokoro / MusicGen 报成 "Not installed"，实际调用也会静默降级。

该变量**已持久化写入 `~/.bashrc`（第 132 行）**，新开的终端自动生效：

```bash
export HYPERFRAMES_PYTHON="/home/cooper/github/my--playground/.venv/bin/python"
```

当前 shell 若还没加载，跑一次 `source ~/.bashrc` 补上即可。

注意：`~/.bashrc` 默认对非交互式 shell 提前 return，所以 `bash -c "..."` 这类调用拿不到这个变量；
遇到这种情况，在命令前临时加一次 `export HYPERFRAMES_PYTHON=...` 或改用登录 shell（`bash -lc`）。

验证：

```bash
npx hyperframes doctor
```

### Python 虚拟环境（uv）

```bash
uv venv .venv                                          # 创建（Python 3.13）
uv pip install --python .venv/bin/python <packages>    # 安装
```

已装（`torch` 为 CPU 版，避免拉 ~2GB CUDA 依赖）：

| 包 | 用途 |
|---|---|
| `torch` (2.15.0+cpu) | MusicGen BGM |
| `transformers` | MusicGen BGM |
| `numpy`, `soundfile` | Kokoro TTS + MusicGen BGM |
| `kokoro-onnx` | Kokoro TTS（本地语音合成） |

`.venv/` 已在 `.gitignore` 中，不要提交。

### 系统依赖（已装）

| 组件 | 状态 |
|---|---|
| FFmpeg / FFprobe | 8.0.1-3ubuntu2，`/usr/bin/` |
| espeak-ng | `/usr/bin/espeak-ng`（非英文 TTS 音素化必需） |
| Chrome Headless Shell | 152.0.7977.30，`~/.cache/hyperframes/chrome/`（需 `libnss3` + `libnspr4`） |
| Docker | 29.8.1，运行中（`render --docker` 用） |

whisper-cpp 未预编译——首次调用 `npx hyperframes transcribe` 时现场编译，首次会慢。

## 常用命令

```bash
npx hyperframes doctor                 # 环境自检
npx hyperframes init <dir>             # 新建项目
npx hyperframes lint                   # 写完先 lint
npx hyperframes check --json           # 完整校验（lint + runtime + layout + contrast）
npx hyperframes snapshot               # 截图看效果
npx hyperframes preview --background   # 本地预览
npx hyperframes render --quality looks -o out.mp4
```

## 网络备注

`raw.githubusercontent.com` 在本机网络不通，`npx hyperframes skills update` 会在校验 manifest 时失败。
实际安装走 git clone（`github.com` 可达），所以指定 skill 名字即可绕过：
`npx hyperframes skills update hyperframes hyperframes-registry media-use`。
