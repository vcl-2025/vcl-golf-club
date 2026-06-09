/**
 * 活动精彩回顾分享 OG HTML：供 Vercel `api/review-og` 与 Cloudflare Pages `functions/*` 共用。
 */

import { UUID_RE } from './informationOgShared'

export const reviewOgPublicPath = '/open-graph/review-og'
export { UUID_RE }

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

const REVIEW_SHARE_LABEL = '活动精彩回顾'

/** 微信等分享卡片副标题：固定带「活动精彩回顾」 */
export function formatReviewShareDescription(plain: string): string {
  const text = stripHtml(plain).trim()
  if (!text) return `VCL Golf Club ${REVIEW_SHARE_LABEL}`
  const snippet = text.slice(0, 180) + (text.length > 180 ? '…' : '')
  return `${REVIEW_SHARE_LABEL} · ${snippet}`
}

function toAbsoluteImageUrl(origin: string, url: string | null | undefined): string {
  if (!url) return `${origin}/logo-192x192.png`
  const u = url.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) return `${origin}${u}`
  return `${origin}/${u}`
}

export type ReviewOgEnv = {
  supabaseUrl?: string | null
  supabaseKey?: string | null
}

export async function loadPublishedReviewOg(
  env: ReviewOgEnv,
  id: string,
  origin: string
): Promise<{ titleRaw: string; descRaw: string; imageAbs: string }> {
  let titleRaw = '活动精彩回顾 - VCL Golf Club'
  let descRaw = 'VCL Golf Club 活动精彩回顾'
  let imageAbs = `${origin}/logo-192x192.png`

  const supabaseUrl = env.supabaseUrl || null
  const supabaseKey = env.supabaseKey || null

  if (supabaseUrl && supabaseKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(id)}&article_published=eq.true&select=title,description,article_excerpt,article_content,article_featured_image_url,image_url`,
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
          description?: string | null
          article_excerpt?: string | null
          article_content?: string | null
          article_featured_image_url?: string | null
          image_url?: string | null
        }>
        const row = rows[0]
        if (row) {
          titleRaw = row.title
            ? `${row.title} - ${REVIEW_SHARE_LABEL}`
            : titleRaw
          const plain = row.article_excerpt?.trim()
            ? row.article_excerpt
            : row.article_content || row.description || ''
          descRaw = formatReviewShareDescription(plain)
          imageAbs = toAbsoluteImageUrl(
            origin,
            row.article_featured_image_url || row.image_url
          )
        }
      }
    } catch {
      // 使用默认文案
    }
  }

  return { titleRaw, descRaw, imageAbs }
}

export function reviewOgCanonicalUrl(origin: string, id: string): string {
  return `${origin}${reviewOgPublicPath}?id=${encodeURIComponent(id)}`
}

export function renderReviewOgHtml(
  origin: string,
  id: string,
  data: { titleRaw: string; descRaw: string; imageAbs: string }
): string {
  const title = escapeHtml(data.titleRaw)
  const description = escapeHtml(data.descRaw)
  const imageEsc = escapeHtml(data.imageAbs)
  const canonical = reviewOgCanonicalUrl(origin, id)
  const articleUrl = `${origin}/review/${id}`

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
  <p style="font-family:system-ui,sans-serif;padding:1rem"><a href="${escapeHtml(articleUrl)}">打开活动精彩回顾</a></p>
</body>
</html>`
}

export function reviewOgResponseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  }
}
