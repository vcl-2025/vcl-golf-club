import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** 构建时写入绝对 og:image，供微信等爬虫读取 SPA 壳页面时显示右下角 logo */
function resolveSiteOrigin() {
  const explicit = process.env.VITE_PUBLIC_SITE_ORIGIN?.trim().replace(/\/$/, '')
  if (explicit) {
    return explicit.startsWith('http://') || explicit.startsWith('https://')
      ? explicit
      : `https://${explicit}`
  }
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  const cf = process.env.CF_PAGES_URL?.trim()
  if (!cf) return ''
  return cf.startsWith('http://') || cf.startsWith('https://')
    ? cf.replace(/\/$/, '')
    : `https://${cf.replace(/\/$/, '')}`
}

function injectAbsoluteOgImage() {
  return {
    name: 'inject-absolute-og-image',
    transformIndexHtml(html) {
      const origin = resolveSiteOrigin()
      if (!origin) return html
      const imageUrl = `${origin}/logo-192x192.png`
      return html.replace(
        '<meta property="og:image" content="/logo-192x192.png" />',
        `<meta property="og:image" content="${imageUrl}" />\n    <meta name="twitter:image" content="${imageUrl}" />`
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), injectAbsoluteOgImage()],
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