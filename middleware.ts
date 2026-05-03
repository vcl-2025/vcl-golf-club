/**
 * Vercel Edge Middleware：分享短链 /i/:uuid 返回带 Open Graph 的 HTML，
 * 供微信等爬虫读取（不执行 JS）。浏览器会再跳转到 SPA 正文 /information/:uuid。
 *
 * 在 Vercel 环境变量中配置（建议与前端 Supabase 变量一致，Edge 中 VITE_ 前缀可能不可用）：
 *   SUPABASE_URL 或 VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY 或 VITE_SUPABASE_ANON_KEY
 */
export const config = {
  matcher: ['/i/:path*'],
}

const UUID_IN_PATH =
  /^\/i\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function toAbsoluteImageUrl(origin: string, url: string | null | undefined): string {
  if (!url) return `${origin}/logo-192x192.png`
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) return `${origin}${u}`
  return `${origin}/${u}`
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const m = url.pathname.match(UUID_IN_PATH)
  if (!m) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const id = m[1]
  const origin = url.origin

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  let titleRaw = '信息中心 - VCL Golf Club'
  let descRaw = 'VCL Golf Club 活动与报名信息'
  let imageAbs = `${origin}/logo-192x192.png`

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/information_items?id=eq.${encodeURIComponent(id)}&select=title,excerpt,content,featured_image_url,status`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      )
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          title?: string
          excerpt?: string | null
          content?: string | null
          featured_image_url?: string | null
          status?: string
        }>
        const row = rows[0]
        if (row && row.status === 'published') {
          titleRaw = row.title || titleRaw
          const plain = row.excerpt?.trim()
            ? stripHtml(row.excerpt)
            : stripHtml(row.content || '')
          descRaw = plain ? plain.slice(0, 200) + (plain.length > 200 ? '…' : '') : descRaw
          imageAbs = toAbsoluteImageUrl(origin, row.featured_image_url)
        }
      }
    } catch {
      // 使用默认文案
    }
  }

  const title = escapeHtml(titleRaw)
  const description = escapeHtml(descRaw)
  const imageEsc = escapeHtml(imageAbs)
  const canonical = `${origin}/i/${id}`
  const articleUrl = `${origin}/information/${id}`

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageEsc}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageEsc}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <script>location.replace(${JSON.stringify(articleUrl)})</script>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;padding:1rem"><a href="${escapeHtml(articleUrl)}">打开正文</a></p>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
