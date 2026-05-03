/** 微信等爬虫会请求的分享预览地址（Vercel `api/information-og` 返回带 OG 的 HTML） */
export function informationSharePreviewUrl(origin: string, itemId: string): string {
  return `${origin}/api/information-og?id=${encodeURIComponent(itemId)}`
}
