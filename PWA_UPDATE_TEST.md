# PWA 更新功能测试指南

## 测试方法

### 方法 1：修改 Service Worker 缓存版本号（推荐）

1. **修改版本号触发更新**
   ```javascript
   // public/sw.js
   const CACHE_NAME = 'golf-club-v3'  // 从 v2 改为 v3
   ```

2. **重新构建并部署**
   ```bash
   npm run build
   # 部署到服务器
   ```

3. **测试步骤**
   - 在手机上打开 PWA 应用（已安装的版本）
   - 等待 60 秒（或手动刷新页面触发检查）
   - 应该会看到底部绿色提示条："🔄 发现新版本可用"
   - 点击"立即更新"，页面会自动刷新并加载新版本

### 方法 2：使用 Chrome DevTools（开发测试）

1. **打开开发者工具**
   - Chrome: `F12` 或右键 → 检查
   - 或者：`Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **找到 Application 标签**
   - 点击 "Application" 标签
   - 左侧找到 "Service Workers"

3. **模拟更新**
   - 看到当前的 Service Worker
   - 勾选 "Update on reload"（每次刷新都检查更新）
   - 修改 `public/sw.js` 中的 `CACHE_NAME`
   - 刷新页面，应该会看到新的 Service Worker 在 "等待激活"
   - 应该会弹出更新提示

4. **手动触发更新**
   - 点击 "Update" 按钮
   - 或点击 "Skip waiting" 按钮

### 方法 3：直接修改文件测试（本地开发）

1. **修改 sw.js**
   ```javascript
   const CACHE_NAME = 'golf-club-v4'  // 每次测试改一个数字
   ```

2. **清除旧缓存**
   - Chrome DevTools → Application → Storage → Clear site data
   - 或者只清除 Cache Storage

3. **重新注册 Service Worker**
   - Application → Service Workers
   - 点击 "Unregister" 注销旧的
   - 刷新页面重新注册新的

### 方法 4：使用网络节流测试（模拟真实场景）

1. **打开 Network 标签**
   - DevTools → Network
   - 网络节流选择 "Slow 3G" 或 "Fast 3G"

2. **观察更新检测**
   - 页面加载时观察 Service Worker 注册
   - 检查是否正常检查更新

## 验证更新是否生效

### 1. 检查版本号
```javascript
// 在浏览器控制台执行
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('当前 Service Worker:', reg.active?.scriptURL);
});
```

### 2. 检查缓存
- DevTools → Application → Cache Storage
- 应该看到新的缓存名称（如 `golf-club-v3`）

### 3. 检查提示是否出现
- 修改版本号后刷新页面
- 应该看到底部绿色提示条

### 4. 测试更新流程
1. ✅ 提示出现
2. ✅ 点击"立即更新"后页面刷新
3. ✅ 刷新后使用新版本
4. ✅ 点击"稍后"后提示消失，但不会刷新

## 常见问题排查

### 问题 1：提示不出现
- 检查 `registration.updatefound` 是否触发
- 检查控制台是否有错误
- 确认新 Service Worker 已安装（状态为 `installed`）

### 问题 2：点击更新后不刷新
- 检查 `controllerchange` 事件是否触发
- 检查 Service Worker 是否调用了 `skipWaiting()`
- 查看控制台错误信息

### 问题 3：更新后还是旧版本
- 清除浏览器缓存
- 硬刷新：`Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- 检查 Service Worker 是否正确注册

### 问题 4：手机上测试不生效
- 确认已部署到服务器（不能只在 localhost 测试）
- 确认手机浏览器支持 Service Worker
- 检查 HTTPS（Service Worker 需要 HTTPS 或 localhost）

## 快速测试脚本

在浏览器控制台执行以下代码快速测试：

```javascript
// 检查当前 Service Worker 状态
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Registration:', reg);
  console.log('Active:', reg?.active);
  console.log('Installing:', reg?.installing);
  console.log('Waiting:', reg?.waiting);
  
  // 手动触发更新检查
  if (reg) {
    reg.update().then(() => {
      console.log('更新检查完成');
    });
  }
});

// 手动触发 skipWaiting（如果有等待中的 Service Worker）
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    console.log('已发送 skipWaiting 消息');
  } else {
    console.log('没有等待中的 Service Worker');
  }
});
```

## 测试清单

- [ ] 修改版本号后能检测到更新
- [ ] 更新提示能正常显示
- [ ] 点击"立即更新"能正常刷新
- [ ] 点击"稍后"不会刷新但提示消失
- [ ] 60 秒定期检查正常工作
- [ ] 新版本激活后页面能正常刷新
- [ ] 更新后使用新版本的缓存

