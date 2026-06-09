/**
 * Cloudflare Pages：活动精彩回顾 OG 页（微信爬虫）
 */

import {
  loadPublishedReviewOg,
  renderReviewOgHtml,
  reviewOgResponseHeaders,
  UUID_RE,
} from '../../src/lib/reviewOgShared'

type CfEnv = Record<string, string | undefined>

export async function onRequestGet(context: { request: Request; env: CfEnv }): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const id = url.searchParams.get('id') || ''
  if (!UUID_RE.test(id)) {
    return new Response('Invalid id', { status: 400 })
  }

  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const host = hostHeader.split(',')[0].trim() || 'localhost'
  const protoHeader = request.headers.get('x-forwarded-proto') || 'https'
  const proto = protoHeader.split(',')[0].trim() || 'https'
  const origin = `${proto}://${host}`

  const data = await loadPublishedReviewOg(
    {
      supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
      supabaseKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
    },
    id,
    origin
  )

  const html = renderReviewOgHtml(origin, id, data)
  return new Response(html, { status: 200, headers: reviewOgResponseHeaders() })
}
