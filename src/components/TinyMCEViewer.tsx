import React, { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

interface TinyMCEViewerProps {
  content: string
  className?: string
  /** 读者端：正文内图片可点击全屏预览，支持双指缩放、拖拽（可选开启） */
  enableImageLightbox?: boolean
}

export default function TinyMCEViewer({
  content,
  className = '',
  enableImageLightbox = false,
}: TinyMCEViewerProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [lightboxAlt, setLightboxAlt] = useState('')

  const openLightbox = useCallback((img: HTMLImageElement) => {
    setLightboxSrc(img.currentSrc || img.src)
    setLightboxAlt(img.alt || '')
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null)
    setLightboxAlt('')
  }, [])

  const onContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enableImageLightbox) return
      const target = e.target as HTMLElement
      if (target.tagName !== 'IMG') return
      e.preventDefault()
      e.stopPropagation()
      openLightbox(target as HTMLImageElement)
    },
    [enableImageLightbox, openLightbox]
  )

  useEffect(() => {
    if (!lightboxSrc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightboxSrc, closeLightbox])

  return (
    <>
      <div
        className={`tinymce-viewer prose max-w-none ${enableImageLightbox ? '[&_img]:cursor-zoom-in' : ''} ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
        onClick={onContainerClick}
      />

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
        >
          <div
            className="absolute inset-0 bg-black/90"
            onClick={closeLightbox}
            aria-hidden
          />
          <button
            type="button"
            className="absolute top-4 right-4 z-[202] p-2 rounded-full bg-white/15 text-white hover:bg-white/25 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute inset-0 flex items-center justify-center p-4 pt-14 pb-10 pointer-events-none z-[201]">
            <div
              className="pointer-events-auto max-w-[min(100%,calc(100vw-2rem))] max-h-[min(85vh,calc(100vh-8rem))] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <TransformWrapper
                initialScale={1}
                minScale={0.6}
                maxScale={5}
                centerOnInit
                limitToBounds
                doubleClick={{ mode: 'zoomIn', step: 0.7 }}
                pinch={{ step: 5 }}
              >
                <TransformComponent
                  wrapperClass="!w-full !h-full flex items-center justify-center"
                  contentClass="flex items-center justify-center"
                >
                  <img
                    src={lightboxSrc}
                    alt={lightboxAlt}
                    className="max-w-full max-h-[min(85vh,100%)] w-auto h-auto object-contain select-none"
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          </div>

          <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-xs px-4 z-[202] pointer-events-none">
            双指缩放 · 拖动查看 · 点击背景或按 ESC 关闭
          </p>
        </div>
      )}
    </>
  )
}
