import React, { useState } from 'react'

export default function UltraSimpleTest() {
  const [imageUrl, setImageUrl] = useState('')

  const handleFileChange = (e: any) => {
    // console.log('=== 超简单文件选择 ===')
    const file = e.target.files[0]
    // console.log('文件:', file)
    
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        // console.log('读取结果:', result.substring(0, 50))
        setImageUrl(result)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>超简单测试</h2>
      
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        style={{ marginBottom: '20px' }}
      />
      
      {imageUrl && (
        <div>
          <h3>图片预览：</h3>
          <img 
            src={imageUrl} 
            alt="test" 
            style={{ maxWidth: '300px', border: '1px solid red' }}
          />
        </div>
      )}
      
      <div>
        <p>图片URL长度: {imageUrl.length}</p>
        <p>图片URL前50字符: {imageUrl.substring(0, 50)}</p>
      </div>
    </div>
  )
}

