import React, { useState } from 'react'
import { Upload } from 'lucide-react'

export default function ImageUploadTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log('文件选择事件触发')
    const file = e.target.files?.[0]
    // console.log('选择的文件:', file)
    
    if (file) {
      // console.log('开始处理文件')
      setSelectedFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        // console.log('文件读取完成，设置预览')
        // console.log('预览URL长度:', result.length)
        setPreviewUrl(result)
        // console.log('预览状态已设置')
      }
      reader.readAsDataURL(file)
    } else {
      // console.log('没有选择文件')
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">图片上传测试</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="test-upload"
        />
        <label htmlFor="test-upload" className="cursor-pointer block">
          {previewUrl ? (
            <div>
              <img
                src={previewUrl}
                alt="预览"
                className="max-w-full max-h-64 mx-auto mb-2 rounded-lg"
              />
              <p className="text-sm text-gray-600">点击更换图片</p>
              <p className="text-xs text-green-600">✓ 预览已加载</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-1">点击上传图片</p>
              <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
            </div>
          )}
        </label>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>选中文件: {selectedFile ? selectedFile.name : '无'}</p>
        <p>预览状态: {previewUrl ? '有预览' : '无预览'}</p>
        <p>预览URL长度: {previewUrl.length}</p>
      </div>
    </div>
  )
}

