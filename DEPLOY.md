# 部署到 GitHub Pages

本文档说明如何把本项目发布到 GitHub Pages。假设已经有仓库
`github.com/codewithwu/my--playground`。

> 不需要安装 `gh` CLI —— 部署由 GitHub Actions 完成,`gh` 未安装也不影响。

---

## 0. 先搞清楚发布地址

这个仓库是**项目站点**(不是用户站点),所以发布地址是**子路径**:

```
https://codewithwu.github.io/my--playground/
        ^^^^^^^^^^ 用户名         ^^^^^^^^^^^ 仓库名
```

**这一点决定了后面所有的配置。** 如果写错,结果是打开就是白屏。

当前仓库名是 `my--playground`(中间两个连字符),这个名字会原样出现在 URL 里。

---

## 1. 一次性设置(只需做一次)

进入仓库 **Settings → Pages → Build and deployment → Source**,选择:

```
Source:  ● GitHub Actions
```

**这一步不做的话,workflow 能跑但部署会失败。** 这是最常见的卡点。

其他设置保持默认:
- Branch:不用管(走 Actions,不从分支构建)
- 需要 HTTPS:保持勾选

---

## 2. 触发部署

进入仓库 **Actions** 标签页:

1. 左侧选择 **Deploy to GitHub Pages**
2. 右上角点 **Run workflow**
3. Branch 下拉选择 **`zhihu`**
4. 点绿色 **Run workflow**

等待 1-2 分钟,完成后即可访问:

```
https://codewithwu.github.io/my--playground/
```

首次部署 GitHub 可能需要 1-2 分钟来注册 Pages 站点,耐心等一下再刷新。

### 为什么是手动触发

工作流用的是 `workflow_dispatch`,不是 `push` 触发。设计原因见 `PLAN.md` Q14:
`zhihu` 分支独立开发,`main` 保持干净,避免每次推送都触发一次部署。

想改成推送即部署,把 `.github/workflows/deploy.yml` 里的:

```yaml
on:
  workflow_dispatch:
```

改成:

```yaml
on:
  push:
    branches: [zhihu]
  workflow_dispatch:
```

---

## 3. 工作流做了什么

`.github/workflows/deploy.yml`(注意:**在仓库根目录,不在 `web/` 下**):

```
1. actions/checkout          拉代码
2. pnpm/action-setup         装 pnpm(版本取自 web/package.json 的 packageManager)
3. actions/setup-node        装 Node 24,开启 pnpm 缓存
4. pnpm install --frozen-lockfile   在 web/ 目录
5. pnpm build                       在 web/ 目录
6. upload-pages-artifact            上传 web/dist
7. deploy-pages                    发布
```

**注意第 2 步读取的是 `web/package.json` 里的 `packageManager` 字段。** 升级 pnpm 时要改那个字段,
不要只在本地装,否则 CI 和本地版本会不一致。

---

## 4. 本地验证生产构建

部署前先在本地确认构建产物是对的:

```bash
cd web
pnpm build
pnpm preview
```

打开 **http://localhost:4173/my--playground/**

> ⚠️ `pnpm dev` 和 `pnpm preview` 的地址**都必须带 `/my--playground/`**。
> 不带会 302 重定向,这是 `base` 生效的正常行为,不是 bug。

**验证这一条**:`grep src web/dist/index.html`,应该看到:

```html
src="/my--playground/assets/index-xxxx.js"
```

如果看到的是 `src="/assets/..."`(没有仓库名),说明 `vite.config.ts` 里的 `base` 配错了,
**上线必定白屏**。

---

## 5. 故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 打开是白屏 | `base` 路径不对 | 检查 `web/vite.config.ts` 的 `base` 是否为 `/my--playground/` |
| 页面能开但样式全丢 | CSS 路径 404 | 同上,`grep` 一下 `dist/index.html` 里的 `href` |
| 刷新后 404 | 用了 history 路由 | 项目用的是 `HashRouter`,不会遇到;若你改过路由需检查 |
| workflow 报 `Pages` 权限错误 | Settings 里 Source 没设成 GitHub Actions | 回到第 1 步 |
| workflow 找不到 `pnpm-lock.yaml` | 缓存配置指向错误 | 检查 `cache-dependency-path: web/pnpm-lock.yaml` |
| 本地能构建、CI 失败 | Node 版本不一致 | CI 固定 Node 24,本地也建议用 24 |
| 打开还是旧的 | CDN 缓存 | 强制刷新(Ctrl/Cmd + Shift + R),或等几分钟 |

---

## 6. 换用户名或仓库名怎么办?

`base` 是硬编码的,改名后必须同步改两处:

1. `web/vite.config.ts` 里的 `base`

   ```ts
   base: '/my--playground/',        →    base: '/新仓库名/',
   ```

2. 本文档和 `README.md` 里的所有 URL

改完先在本地 `pnpm build` + `pnpm preview` 验证,再提交。

---

## 7. 关于凭据的安全说明

**部署过程不涉及任何 Access Secret。**

- 凭据由使用者在浏览器里输入,只存在 `sessionStorage`,**关掉标签页即清除**
- CI 只做构建和发布,不需要、也不会拿到任何凭据
- 本仓库代码里不含任何密钥(可以用 `grep` 验证)

因此把应用部署到公开的 GitHub Pages 上**不会泄露你的 Access Secret**。

但要清楚一件事:**这是个公开的应用,任何人都能打开**。别人访问时会看到自己的
输入框(他们需要填自己的 Key 才能看到任何数据)。你的数据不会因为部署而暴露。

---

## 8. 部署后的自检清单

部署成功后打开页面,依次确认:

- [ ] 页面正常渲染,不是白屏
- [ ] 未输入 Key 时,任何路径都重定向到「连接你的知乎开放平台」
- [ ] 填入**错误**的 Key → 提示「Access Secret 无效或已被撤销」,不进入应用
- [ ] 填入**正确**的 Key → 进入总览,看到真实的粉丝数、受众画像
- [ ] 侧边栏切换三个板块均正常
- [ ] 浏览器控制台无报错
- [ ] 打开 DevTools → Application → Session Storage,能看到 `zhihu.accessSecret`;
      关闭标签页重开后该值消失
