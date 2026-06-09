/**
 * Vercel Serverless：活动精彩回顾 Open Graph HTML，供微信等抓取。
 * 分享链接：GET /open-graph/review-og?id=<event-uuid>
 */

import {
  loadPublishedReviewOg,
  renderReviewOgHtml,
  UUID_RE,
} from '../src/lib/reviewOgShared'

type VercelApiReq = {
  method?: string
  query: { id?: string | string[] }
  headers: { [k: string]: string | string[] | undefined }
}

type VercelApiRes = {
  status: (n: number) => VercelApiRes
  setHeader: (k: string, v: string) => void
  send: (body: string) => void
  end: (body?: string) => void
}

export default async function handler(req: VercelApiReq, res: VercelApiRes) {
  if (req.method && req.method !== 'GET') {
    res.status(405).end('Method Not Allowed')
    return
  }

  const idRaw = req.query?.id
  const id = typeof idRaw === 'string' ? idRaw : Array.isArray(idRaw) ? idRaw[0] : ''
  if (!id || !UUID_RE.test(id)) {
    res.status(400).end('Invalid id')
    return
  }

  const protoHeader = req.headers['x-forwarded-proto']
  const proto =
    (typeof protoHeader === 'string' ? protoHeader : protoHeader?.[0] || 'https')
      .split(',')[0]
      .trim() || 'https'
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host
  const host =
    (typeof hostHeader === 'string' ? hostHeader : hostHeader?.[0] || '')
      .split(',')[0]
      .trim() || 'localhost'
  const origin = `${proto}://${host}`

  const data = await loadPublishedReviewOg(
    {
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    },
    id,
    origin
  )

  const html = renderReviewOgHtml(origin, id, data)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(html)
}
