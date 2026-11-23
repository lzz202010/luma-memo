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

已配置 GitHub Actions 自动部署到 GitHub Pages：

- 仓库：https://github.com/lzz202010/luma-memo
- 网址：https://lzz202010.github.io/luma-memo/

推送 `main` 分支即触发构建发布（见 `.github/workflows/deploy.yml`）。

### 换域名 / 换仓库名

`vite.config.ts` 里的 `PAGES_BASE` 决定资源前缀：

- 项目站点（`/<repo>/`）：保持 `/luma-memo/`
- 用户站点（`<user>.github.io` 根目录）或自定义域名：改成 `/`

同时 `public/manifest.webmanifest` 与 `public/sw.js` 使用相对路径 / 注册作用域推导，无需改动。

## 图标

`public/icon.svg` 是源文件；`public/icons/*.png`（192/512/maskable/180）由脚本生成：

```bash
python3 scripts/gen-icons.py   # 需要 Pillow
```

## 说明

- PWA 需要 HTTPS；GitHub Pages 自动提供，iOS Safari「添加到主屏幕」后可离线打开。
- 默认 AI 接口指向本机 Ollama（`http://127.0.0.1:11434`）。从 HTTPS 页面调用 `http://` 地址会被浏览器按混合内容拦截，手机上使用时请在设置里改用 HTTPS 的 AI 接口地址。
