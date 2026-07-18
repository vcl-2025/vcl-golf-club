/**
 * Cloudflare Pages：主站 `_redirects` 里 `/* -> /index.html` 会抢走
 * `/log-lottery/home` 等客户端路由，导致抽奖 Vue SPA 装不上。
 *
 * Functions 匹配的请求不会走 `_redirects`；这里先尝试静态资源，
 * 404 且不是带扩展名的文件时，回退到抽奖 index.html。
 */

type PagesContext = {
  request: Request
  next: () => Promise<Response>
  env: { ASSETS: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> } }
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const response = await context.next()
  if (response.status !== 404) return response

  const url = new URL(context.request.url)
  // 真实静态资源缺失时保持 404，避免把 .js/.css 伪造成 HTML
  if (/\.[a-zA-Z0-9]+$/.test(url.pathname)) return response

  return context.env.ASSETS.fetch(new URL('/log-lottery/index.html', url.origin))
}
