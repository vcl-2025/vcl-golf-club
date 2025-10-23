# 模板管理说明

## 📁 文件结构
```
src/templates/
├── index.ts                    # 模板配置和加载逻辑
├── activity-review.html        # 活动回顾模板
├── competition-notice.html     # 比赛通知模板
├── member-activity.html        # 会员活动模板
├── official-announcement.html # 官方公告模板
└── README.md                   # 说明文档
```

## 🚀 如何添加新模板

### 1. 创建模板文件
在 `src/templates/` 目录下创建新的 `.html` 文件，例如：
```html
<!-- src/templates/new-template.html -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px;">
  <h1>新模板标题</h1>
  <p>模板内容...</p>
</div>
```

### 2. 更新配置文件
在 `src/templates/index.ts` 中添加新模板配置：
```typescript
export const templateConfig: Template[] = [
  // ... 现有模板
  {
    title: '新模板名称',
    description: '新模板描述',
    content: ''
  }
];
```

### 3. 更新加载逻辑
在 `loadTemplates` 函数中添加新模板的导入：
```typescript
const templates = await Promise.all([
  import('./activity-review.html?raw'),
  import('./competition-notice.html?raw'),
  import('./member-activity.html?raw'),
  import('./official-announcement.html?raw'),
  import('./new-template.html?raw')  // 添加这行
]);
```

## 🎨 模板设计建议

### 样式特点
- ✅ 使用内联样式（`style` 属性）
- ✅ 响应式设计（`grid`、`flexbox`）
- ✅ 渐变背景和阴影效果
- ✅ 图标和 Emoji 装饰
- ✅ 专业配色方案

### 内容结构
- 📝 清晰的标题和副标题
- 📋 结构化的信息展示
- 🎯 可编辑的占位符文本
- 📞 联系方式和重要信息

## 🔧 技术说明

### 工作原理
1. **文件分离** - 每个模板独立 HTML 文件
2. **动态加载** - 运行时加载模板内容
3. **配置管理** - 统一的模板配置
4. **自动更新** - 修改文件后自动生效

### 优势
- ✅ **易于维护** - 模板文件独立管理
- ✅ **版本控制** - 每个模板可单独追踪
- ✅ **团队协作** - 不同人员可编辑不同模板
- ✅ **AI 生成** - 可直接让 AI 生成新模板文件

## 📝 使用示例

### 让 AI 生成新模板
```
请为高尔夫俱乐部创建一个"会员生日祝福"模板，要求：
1. 使用渐变背景和现代设计
2. 包含生日祝福语和俱乐部信息
3. 使用卡片式布局
4. 添加适当的图标和装饰
```

然后将生成的 HTML 保存为 `src/templates/birthday-wishes.html` 并更新配置即可！
