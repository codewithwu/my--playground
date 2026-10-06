import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 的项目站点部署在子路径 https://<user>.github.io/<repo>/,
//而不是域名根。base 不配对会导致打包后的 JS/CSS 请求 404,表现为白屏。
export default defineConfig({
  base: '/my--playground/',
  plugins: [react(), tailwindcss()],
})
