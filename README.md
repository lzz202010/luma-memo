# 拾光 · 灵感备忘录

适配 iOS Safari 的极简大字号灵感备忘录：本地 IndexedDB 存储、一键复制问 AI、支持直连 AI 接口，可作为 PWA 添加到主屏幕离线使用。

- 技术栈：Vite 6 + React 19 + TypeScript
- 数据：全部保存在设备本地（IndexedDB），不上传服务器

## 本地开发

```bash
npm install
npm run dev     # http://localhost:5173/luma-memo/
npm run build   # 产物在 dist/
npm run preview # 预览构建产物
```

> 构建带 `base: '/luma-memo/'`，所以开发地址也带该前缀。

## 部署

已发布到 GitHub Pages：

- 仓库：https://github.com/lzz202010/luma-memo
- 网址：https://lzz202010.github.io/luma-memo/

发布方式是 `gh-pages` 分支：Pages 直接托管该分支里的构建产物（`.nojekyll` 已包含）。改完代码后执行：

```bash
npm run deploy   # 构建 + 推送 dist 到 gh-pages 分支
```

### 可选：推送即自动部署

当前 `gh` 登录令牌缺少 `workflow` 权限，所以仓库里没放 Actions 工作流。如果想让每次 push 到 `main` 都自动构建发布：

```bash
gh auth refresh -s workflow                      # 浏览器授权一次
mkdir -p .github/workflows
cp docs/github-pages-workflow.yml .github/workflows/deploy.yml
git add .github && git commit -m "ci: GitHub Actions 自动部署" && git push
```

然后到仓库 Settings → Pages，把 Source 从 “Deploy from a branch (gh-pages)” 改为 “GitHub Actions”。

### 换域名 / 换仓库名

`vite.config.ts` 使用 `base: './'`（相对路径），因此项目站点（`/<repo>/`）、用户站点根目录、自定义域名都通用，换仓库名或绑域名都不需要改配置。

`public/manifest.webmanifest` 与 `public/sw.js` 同样全部使用相对路径，靠注册作用域自动定位，无需改动。

## 图标

`public/icon.svg` 是源文件；`public/icons/*.png`（192/512/maskable/180）由脚本生成：

```bash
python3 scripts/gen-icons.py   # 需要 Pillow
```

## 说明

- PWA 需要 HTTPS；GitHub Pages 自动提供，iOS Safari「添加到主屏幕」后可离线打开。
- 默认 AI 接口指向本机 Ollama（`http://127.0.0.1:11434`）。从 HTTPS 页面调用 `http://` 地址会被浏览器按混合内容拦截，手机上使用时请在设置里改用 HTTPS 的 AI 接口地址。
