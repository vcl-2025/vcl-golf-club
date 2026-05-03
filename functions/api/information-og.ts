/** 兼容旧分享链接 GET /api/information-og?id=（在 CF Pages 上同样由 Function 提供，不经 SPA _redirects） */

import {
  informationOgResponseHeaders,
  loadPublishedInformationOg,
  renderInformationOgHtml,
  UUID_RE,
} from '../../src/lib/informationOgShared'

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

  const data = await loadPublishedInformationOg(
    {
      supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
      supabaseKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
    },
    id,
    origin
  )

  const html = renderInformationOgHtml(origin, id, data)
  return new Response(html, { status: 200, headers: informationOgResponseHeaders() })
}
