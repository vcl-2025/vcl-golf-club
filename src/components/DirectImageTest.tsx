import React, { useState } from 'react'

export default function DirectImageTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log('=== 直接文件选择事件触发 ===')
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
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        直接图片上传测试
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
      </div>
      
      {previewUrl && (
        <div style={{ marginBottom: '20px' }}>
          <h3>图片预览：</h3>
          <img
            src={previewUrl}
            alt="预览"
            style={{ 
              maxWidth: '100%', 
              maxHeight: '300px', 
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
      
      <div style={{ fontSize: '14px', color: '#666' }}>
        <p>选中文件: {selectedFile ? selectedFile.name : '无'}</p>
        <p>预览状态: {previewUrl ? '有预览' : '无预览'}</p>
        <p>预览URL长度: {previewUrl.length}</p>
        <p>预览URL前50字符: {previewUrl.substring(0, 50)}...</p>
      </div>
    </div>
  )
}

