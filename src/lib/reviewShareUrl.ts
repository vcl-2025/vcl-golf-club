import { reviewOgPublicPath } from './reviewOgShared'

/** 微信等爬虫请求的回顾分享预览地址 */
export function reviewSharePreviewUrl(origin: string, eventId: string): string {
  return `${origin}${reviewOgPublicPath}?id=${encodeURIComponent(eventId)}`
}
