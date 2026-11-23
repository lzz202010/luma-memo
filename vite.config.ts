import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 项目站点部署在 /<repo>/ 子路径下，构建产物必须带这个 base。
// 若以后绑自定义域名或改为用户站点，把 base 改成 '/' 即可。
const PAGES_BASE = '/luma-memo/';

export default defineConfig({
  base: PAGES_BASE,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
