/**
 * 信息中心分享 OG HTML：供 Vercel `api/information-og` 与 Cloudflare Pages `functions/*` 共用。
 * 正式分享链接请用 {@link informationOgPublicPath}（避免 CF `_redirects` 把 `/api/*` 打成 SPA）。
 */

export const informationOgPublicPath = '/open-graph/information-og'

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export type InformationOgEnv = {
  supabaseUrl?: string | null
  supabaseKey?: string | null
}

export async function loadPublishedInformationOg(
  env: InformationOgEnv,
  id: string,
  origin: string
): Promise<{ titleRaw: string; descRaw: string; imageAbs: string }> {
  let titleRaw = '信息中心 - VCL Golf Club'
  let descRaw = 'VCL Golf Club 活动与报名信息'
  let imageAbs = `${origin}/logo-192x192.png`

  const supabaseUrl = env.supabaseUrl || null
  const supabaseKey = env.supabaseKey || null

  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/information_items?id=eq.${encodeURIComponent(id)}&select=title,excerpt,content,featured_image_url,status`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      )
      if (r.ok) {
        const rows = (await r.json()) as Array<{
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

  return { titleRaw, descRaw, imageAbs }
}

export function informationOgCanonicalUrl(origin: string, id: string): string {
  return `${origin}${informationOgPublicPath}?id=${encodeURIComponent(id)}`
}

export function renderInformationOgHtml(
  origin: string,
  id: string,
  data: { titleRaw: string; descRaw: string; imageAbs: string }
): string {
  const title = escapeHtml(data.titleRaw)
  const description = escapeHtml(data.descRaw)
  const imageEsc = escapeHtml(data.imageAbs)
  const canonical = informationOgCanonicalUrl(origin, id)
  const articleUrl = `${origin}/information/${id}`

  return `<!DOCTYPE html>
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
}

export function informationOgResponseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  }
}
