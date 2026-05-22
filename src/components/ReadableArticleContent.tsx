import React, { useCallback, useState } from 'react'
import { Type } from 'lucide-react'
import TinyMCEViewer from './TinyMCEViewer'

export type ArticleFontSize = 'normal' | 'large'

const STORAGE_KEY = 'vcl-event-review-article-font-size'

function loadSavedFontSize(): ArticleFontSize {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'large' ? 'large' : 'normal'
  } catch {
    return 'normal'
  }
}

interface ReadableArticleContentProps {
  content: string
  enableImageLightbox?: boolean
}

/** 活动回顾等长文阅读：标准 18px / 大字号 24px，偏好写入 localStorage */
export default function ReadableArticleContent({
  content,
  enableImageLightbox = true,
}: ReadableArticleContentProps) {
  const [fontSize, setFontSize] = useState<ArticleFontSize>(loadSavedFontSize)

  const selectSize = useCallback((size: ArticleFontSize) => {
    setFontSize(size)
    try {
      localStorage.setItem(STORAGE_KEY, size)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="readable-article">
      <div
        className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl"
        role="group"
        aria-label="正文字号"
      >
        <Type className="w-5 h-5 text-gray-500 flex-shrink-0" aria-hidden />
        <span className="text-sm text-gray-600 mr-1">阅读字号</span>
        <button
          type="button"
          onClick={() => selectSize('normal')}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-base font-medium transition-colors touch-manipulation ${
            fontSize === 'normal'
              ? 'bg-[#F15B98] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-[#F15B98]/50'
          }`}
          aria-pressed={fontSize === 'normal'}
        >
          标准
        </button>
        <button
          type="button"
          onClick={() => selectSize('large')}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-lg font-medium transition-colors touch-manipulation ${
            fontSize === 'large'
              ? 'bg-[#F15B98] text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-[#F15B98]/50'
          }`}
          aria-pressed={fontSize === 'large'}
        >
          大字号
        </button>
        <span className="text-xs text-gray-500 w-full sm:w-auto sm:ml-auto">
          {fontSize === 'large' ? '约 24 像素' : '约 18 像素'} · 点击图片可放大
        </span>
      </div>

      <div
        className={`readable-article-body readable-article--${fontSize} prose max-w-none`}
      >
        <TinyMCEViewer
          content={content}
          enableImageLightbox={enableImageLightbox}
        />
      </div>
    </div>
  )
}
