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
    // 支持旧版浏览器，包括 iPhone 6 的 Safari (iOS 12)
    // 这会将可选链 ?. 和空值合并 ?? 等 ES2020 语法转译为 ES2015
    target: ['es2015', 'safari10'],
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,      // 指定端口
    strictPort: true  // 如果端口被占用则报错
  }
})