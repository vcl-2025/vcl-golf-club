// 移动端视口处理工具
export const preventIOSZoom = () => {
  // 检测是否为iOS设备
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  if (isIOS) {
    // 设置视口元标签防止缩放
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }
  }
}

// 重置视口到正常状态
export const resetViewport = () => {
  const viewport = document.querySelector('meta[name=viewport]')
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
  }
}

// 处理输入框聚焦事件
export const handleInputFocus = () => {
  // 延迟执行以确保在iOS缩放之前生效
  setTimeout(() => {
    resetViewport()
  }, 100)
}

// 处理输入框失焦事件
export const handleInputBlur = () => {
  setTimeout(() => {
    resetViewport()
  }, 100)
}

// 初始化移动端视口设置
export const initMobileViewport = () => {
  // 页面加载时设置
  preventIOSZoom()
  
  // 监听所有输入框事件
  const inputs = document.querySelectorAll('input, textarea, select')
  inputs.forEach(input => {
    input.addEventListener('focus', handleInputFocus)
    input.addEventListener('blur', handleInputBlur)
  })
  
  // 监听页面可见性变化（从后台返回时）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resetViewport()
    }
  })
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    resetViewport()
  })
}






