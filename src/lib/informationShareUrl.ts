import { informationOgPublicPath } from './informationOgShared'

/** 微信等爬虫请求的分享预览地址（CF Pages Function 或 Vercel 重写至 api/information-og） */
export function informationSharePreviewUrl(origin: string, itemId: string): string {
  return `${origin}${informationOgPublicPath}?id=${encodeURIComponent(itemId)}`
}
