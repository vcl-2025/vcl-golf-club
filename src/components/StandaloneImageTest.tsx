import React, { useState } from 'react'

export default function StandaloneImageTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // console.log('=== 文件选择事件触发 ===')
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
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        独立图片上传测试
      </h2>
      
      <div style={{ 
        border: '2px dashed #ccc', 
        borderRadius: '8px', 
        padding: '20px', 
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="standalone-upload"
        />
        <label htmlFor="standalone-upload" style={{ cursor: 'pointer', display: 'block' }}>
          {previewUrl ? (
            <div>
              <img
                src={previewUrl}
                alt="预览"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px', 
                  margin: '0 auto 10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}
              />
              <p style={{ color: '#666', fontSize: '14px' }}>点击更换图片</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '48px', color: '#999', marginBottom: '10px' }}>📁</div>
              <p style={{ color: '#333', marginBottom: '5px' }}>点击上传图片</p>
              <p style={{ color: '#666', fontSize: '12px' }}>支持 JPG、PNG 格式</p>
            </div>
          )}
        </label>
      </div>
      
      <div style={{ fontSize: '14px', color: '#666' }}>
        <p>选中文件: {selectedFile ? selectedFile.name : '无'}</p>
        <p>预览状态: {previewUrl ? '有预览' : '无预览'}</p>
        <p>预览URL长度: {previewUrl.length}</p>
        <p>预览URL前50字符: {previewUrl.substring(0, 50)}...</p>
      </div>
    </div>
  )
}

