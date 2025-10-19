import React, { useState } from 'react'
import { X, Upload } from 'lucide-react'

interface SimpleEventFormProps {
  onClose: () => void
}

export default function SimpleEventForm({ onClose }: SimpleEventFormProps) {
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null)
  const [qrCodePreview, setQrCodePreview] = useState<string>('')

  const handleQRCodeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setQrCodeFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setQrCodePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">图片上传测试</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 图片上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                二维码图片
              </label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRCodeFileChange}
                  className="hidden"
                  id="qr-code-upload"
                />
                <label htmlFor="qr-code-upload" className="cursor-pointer block">
                  {qrCodePreview ? (
                    <div>
                      <img
                        src={qrCodePreview}
                        alt="二维码预览"
                        className="max-w-full max-h-64 mx-auto mb-2 rounded-lg"
                      />
                      <p className="text-sm text-gray-600">点击更换图片</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">点击上传二维码</p>
                      <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* 状态显示 */}
            <div className="text-sm text-gray-600">
              <p>选中文件: {qrCodeFile ? qrCodeFile.name : '无'}</p>
              <p>预览状态: {qrCodePreview ? '有预览' : '无预览'}</p>
              <p>预览URL长度: {qrCodePreview.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

