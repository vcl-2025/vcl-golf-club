// 简单的浏览器测试代码
// 复制这段代码到浏览器控制台中运行

// 方法1：检查页面上的活动数据
console.log('=== 检查页面活动数据 ===')

// 查找活动列表组件
const eventListElement = document.querySelector('[data-testid="event-list"]') || 
                        document.querySelector('.grid') ||
                        document.querySelector('[class*="grid"]')

if (eventListElement) {
  console.log('找到活动列表元素:', eventListElement)
  console.log('活动列表子元素数量:', eventListElement.children.length)
  
  // 检查每个活动卡片
  const eventCards = eventListElement.querySelectorAll('[class*="bg-white"], [class*="rounded"]')
  console.log('活动卡片数量:', eventCards.length)
  
  eventCards.forEach((card, index) => {
    const title = card.querySelector('h3, h2, [class*="title"]')?.textContent
    const status = card.querySelector('[class*="status"], [class*="badge"]')?.textContent
    console.log(`活动 ${index + 1}: ${title} - 状态: ${status}`)
  })
} else {
  console.log('未找到活动列表元素')
}

// 方法2：检查React组件状态
console.log('\n=== 检查React组件状态 ===')

// 查找React组件实例
const reactRoot = document.querySelector('#root')
if (reactRoot && reactRoot._reactInternalFiber) {
  console.log('找到React根组件')
} else {
  console.log('未找到React根组件')
}

// 方法3：检查网络请求
console.log('\n=== 检查网络请求 ===')
console.log('请查看Network标签页中的API请求，特别是events相关的请求')

// 方法4：检查控制台错误
console.log('\n=== 检查控制台错误 ===')
console.log('请查看是否有任何JavaScript错误或网络请求失败')

