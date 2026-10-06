# 知乎创作者工作台

面向知乎创作者的**内容诊断仪表盘 + 选题搜索雷达**。纯前端,可部署到 GitHub Pages。

数据来自[知乎开放平台](https://developer.zhihu.com/docs)。这是一个**第三方客户端**,
与知乎官方无关。

---

## 它能做什么

- **总览** —— 账号维度的阅读/获赞/收藏/评论、粉丝总数与活跃度、内容指标
- **受众画像** —— 读者画像(流量来源、性别、年龄、地域)与粉丝画像(关注来源、活跃度、
  兴趣、系统、地域),外加 24 小时活跃时段柱图
- **互动** —— 谁在和你互动、哪篇内容带来了关注
- **我的创作** —— 单篇内容的指标、全文和评论(三个接口串行拉取,分区渐进呈现)
- **发现** —— 知乎热榜、知乎站内搜索(5 种排序)、全网搜索(4 档时间过滤)

**它不是什么**:18 篇接口文档里只用了 8 个。没有趋势图(接口不提供时间序列),
没有 PDF 解析和 PPT 生成(额度只有 10 次/天),没有日期筛选(传了日期参数会返回全 0)。
取舍理由见 [`PLAN.md`](./PLAN.md)。

## 快速开始

```bash
cd web
pnpm install
pnpm dev
```

打开 **http://localhost:5173/my--playground/**

> ⚠️ 地址必须带 `/my--playground/`。这是因为部署目标是 GitHub Pages 的**子路径**,
> Vite 的 `base` 在 dev 模式同样生效,不带前缀会 302 重定向。

其他命令:

```bash
pnpm build      # 生产构建 → web/dist
pnpm preview    # 预览生产构建
pnpm check      # 类型检查 + ESLint
pnpm lint       # 只跑 ESLint
```

## 关于你的凭据

- 本应用**不存储、不代理、不转发**任何 Access Secret。
- 凭据只保存在浏览器 `sessionStorage`,**关闭标签页即清除**。
- 所有请求由你的浏览器**直接发往知乎开放平台**,没有中间服务器。

请在[开放平台个人中心](https://developer.zhihu.com/profile)获取你自己的 Access Secret。
**没有它本应用无法获取任何数据** —— 开放平台不提供跨账号访问,所有数据只属于凭据所属的账号。

## 额度与限流

实测得到的数字(文档里没有):

| 额度桶 | 每日 | 说明 |
|---|---|---|
| `creator`(创作数据) | **200** | 09/10/11/12 共用 |
| `hot_list`(热榜) | **100** | |
| `zhihu_search` / `global_search` | 5000 各 | |
| `user_data` | 10000 | 未使用 |

**限流**(实测阶梯测试,两个桶阈值不同):

- `creator` 桶:间隔小于 500ms 会返回 `30001`,实现取 **700ms**
- 搜索接口:间隔 200ms 会返回 `30001`,实现取 **300ms**

所以应用内部有一个请求调度器,**同时限制并发数和最小请求间隔**。这也是为什么
「我的创作」页的三个区块是依次出现的,而不是一起出来。

> 「限制并发数」不等于「限速」—— 这个坑踩了两次才彻底解决。

## 技术栈

React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · TanStack Query 5 · DOMPurify · lossless-json

图表用 div 手写而非图表库:100% 分布数据用进度条更准,也省约 150KB。

## 安全

知乎正文和评论都是**用户可控的 HTML**,而凭据就存在页面能读到的存储里——
一次 XSS 就能拿走所有在线访客的 Access Secret。因此:

- 富文本**只有一条渲染路径**:`<SafeHtml>` → `DOMPurify`
- ESLint 规则强制 `dangerouslySetInnerHTML` 只允许出现在 `components/SafeHtml.tsx`
- 外链一律 `rel="noopener noreferrer"`,并剥离接口附带的 `utm_*` 追踪参数

安全审计结果与 12 种 XSS 载荷的验证记录见 [`PLAN.md`](./PLAN.md) §6、§2.11。

## 部署

GitHub Actions 手动触发(`zhihu` 分支,`main` 保持干净):

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**(一次性设置)
2. Actions 标签页 → `Deploy to GitHub Pages` → Run workflow

发布地址:`https://codewithwu.github.io/my--playground/`

## 项目结构

```
web/src/
├── lib/
│   ├── api/          client(唯一请求出口) / scheduler(限流) / parse(无损 JSON) / errors / types
│   ├── sanitize.ts   唯一的 HTML 消毒出口
│   ├── format.ts     唯一的数字渲染出口(缺失一律 —,绝不补 0)
│   └── session.ts    sessionStorage 凭据存储
├── components/       ui 原语 / layout / charts
└── features/         connect(门禁) / overview / creator / discover
```

`docs/` 是 18 篇接口文档。`PLAN.md` 是这个项目的完整设计与全部实测结论 ——
**遇到任何「接口为什么这样」的问题,答案基本都在那里。**

## 致谢

接口由[知乎开放平台](https://developer.zhihu.com/docs)提供。
本项目为第三方客户端,仅供学习与个人使用。
