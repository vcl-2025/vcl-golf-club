import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'tinymce': resolve(__dirname, 'node_modules/tinymce')
    }
  },
  optimizeDeps: {
    include: ['tinymce']
  },
  build: {
    // 支持现代浏览器，使用 ES2017 作为构建目标
    // ES2017 支持 const/let，同时保持较好的兼容性
    target: 'es2017',
    // 使用默认的 esbuild minifier（更快，无需额外依赖）
    minify: 'esbuild',
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,      // 指定端口
    strictPort: true  // 如果端口被占用则报错
  }
})