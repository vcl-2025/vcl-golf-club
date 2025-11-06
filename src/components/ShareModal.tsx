import React, { useState } from 'react'
import { X, Share2, Copy, Check, MessageCircle, Link as LinkIcon } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title: string
  description?: string
  imageUrl?: string
}

export default function ShareModal({ isOpen, onClose, url, title, description, imageUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const copyToClipboard = async (text: string) => {
    try {
      // 尝试使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        return true
      } else {
        // 使用传统方法
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        textarea.style.top = '-999999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (successful) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        return successful
      }
    } catch (error) {
      console.error('复制失败:', error)
      return false
    }
  }

  const handleCopy = () => {
    copyToClipboard(url)
  }

  const handleWeChatShare = () => {
    // 在微信浏览器中，可以通过显示二维码让用户扫描
    // 或者提示用户使用微信的分享功能
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      alert('请点击右上角菜单，选择"发送给朋友"或"分享到朋友圈"')
    } else {
      // 非微信浏览器，显示提示
      alert('请将链接复制后，在微信中打开并分享')
      copyToClipboard(url)
    }
  }

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: description || title,
          url,
        })
        onClose()
      } else {
        // 不支持原生分享，显示分享选项
        handleCopy()
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        // 分享失败，降级到复制
        handleCopy()
      }
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-[#F15B98] to-[#F36C92] p-6 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center">
              <Share2 className="w-5 h-5 mr-2" />
              分享活动
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 分享卡片预览 */}
        <div className="p-6 border-b border-gray-200">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{title}</h4>
            {description && (
              <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
            )}
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <LinkIcon className="w-3 h-3 mr-1" />
              <span className="truncate">{url}</span>
            </div>
          </div>
        </div>

        {/* 分享选项 */}
        <div className="p-6 space-y-3">
          {/* 原生分享按钮（移动端优先） */}
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-[#F15B98] to-[#F36C92] text-white rounded-lg hover:from-[#F15B98]/90 hover:to-[#F36C92]/90 transition-all font-medium shadow-lg"
            >
              <Share2 className="w-5 h-5 mr-2" />
              使用系统分享
            </button>
          )}

          {/* 微信分享 */}
          {/MicroMessenger/i.test(navigator.userAgent) && (
            <button
              onClick={handleWeChatShare}
              className="w-full flex items-center justify-center px-6 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              分享到微信
            </button>
          )}

          {/* 复制链接 */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2 text-green-600" />
                <span className="text-green-600">已复制！</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                复制链接
              </>
            )}
          </button>
        </div>

        {/* 提示文字 */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500">
            将链接分享给朋友，让他们也能查看这个活动
          </p>
        </div>
      </div>
    </div>
  )
}

