# PCCA 扁平化UI美化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面美化PCCA应用界面，采用扁平化设计风格，提升整体视觉体验。

**Architecture:** 基于现有Vue 3 + Tailwind CSS架构，通过修改CSS变量、组件样式和布局结构实现扁平化设计。

**Tech Stack:** Vue 3, Tailwind CSS, CSS Variables, Scoped Styles

---

### Task 1: 更新CSS变量系统

**Covers:** [S3, S4.3]

**Files:**
- Modify: `src/assets/styles/tailwind.css:6-44`

- [ ] **Step 1: 更新暗色主题CSS变量**

```css
/* ===== 暗色主题（默认） ===== */
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --bg-card: #1c2128;
  --bg-hover: #272d36;
  --border: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --accent: #0DC26F;
  --accent-hover: #0EA87F;
  --accent-rgb: 13,194,111;
  --green: #3fb950;
  --red: #f85149;
  --orange: #d29922;
  --sidebar-width: 200px;
  --topbar-height: 56px;
  --radius: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 2: 更新浅色主题CSS变量**

```css
/* ===== 浅色主题 ===== */
:root.light {
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e9ecef;
  --bg-card: #ffffff;
  --bg-hover: #f0f0f0;
  --border: #dee2e6;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #adb5bd;
  --accent: #0DC26F;
  --accent-hover: #0BA85D;
  --green: #0DC26F;
  --red: #e53935;
  --orange: #f57c00;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 3: 更新全局样式**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  line-height: 1.5;
}
```

- [ ] **Step 4: 提交更改**

```bash
git add src/assets/styles/tailwind.css
git commit -m "style: 更新CSS变量系统，优化颜色和阴影变量"
```

### Task 2: 更新侧边栏样式

**Covers:** [S3.1, S3.2, S4.1]

**Files:**
- Modify: `src/components/layout/AppSidebar.vue:87-185`

- [ ] **Step 1: 更新侧边栏容器样式**

```css
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
```

- [ ] **Step 2: 更新导航项样式**

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.15s ease;
  position: relative;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  text-align: left;
  border-radius: var(--radius);
  margin: 2px 8px;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
}
```

- [ ] **Step 3: 移除激活状态左侧边框**

```css
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}
```

- [ ] **Step 4: 提交更改**

```bash
git add src/components/layout/AppSidebar.vue
git commit -m "style: 更新侧边栏样式，采用扁平化设计"
```

### Task 3: 更新内容卡片样式

**Covers:** [S3.1, S3.3, S4.2]

**Files:**
- Modify: `src/components/feed/FeedCard.vue:90-206`

- [ ] **Step 1: 更新卡片容器样式**

```css
.feed-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s ease;
  box-shadow: var(--shadow-sm);
}

.feed-card:hover {
  border-color: var(--accent);
}
```

- [ ] **Step 2: 更新用户头像样式**

```css
.feed-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
```

- [ ] **Step 3: 更新用户名和时间样式**

```css
.feed-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.feed-username:hover {
  color: var(--accent);
}

.feed-time {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}
```

- [ ] **Step 4: 更新图片网格样式**

```css
.feed-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.feed-images img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius);
  cursor: zoom-in;
  background: var(--bg-tertiary);
}
```

- [ ] **Step 5: 提交更改**

```bash
git add src/components/feed/FeedCard.vue
git commit -m "style: 更新内容卡片样式，采用扁平化设计"
```

### Task 4: 更新整体布局

**Covers:** [S3.2, S4.4]

**Files:**
- Modify: `src/components/layout/AppLayout.vue:1-22`
- Modify: `src/App.vue:40-75`

- [ ] **Step 1: 更新主布局样式**

```css
/* 在 AppLayout.vue 中添加样式 */
<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-primary);
  padding: 20px;
}
</style>
```

- [ ] **Step 2: 更新全局滚动条样式**

```css
/* 在 App.vue 中更新滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

- [ ] **Step 3: 提交更改**

```bash
git add src/components/layout/AppLayout.vue src/App.vue
git commit -m "style: 更新整体布局，优化间距和滚动条样式"
```

### Task 5: 验证和测试

**Covers:** [S6, S8]

**Files:**
- None (测试任务)

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证视觉效果**

检查以下内容：
1. 侧边栏导航项是否有圆角和适当间距
2. 内容卡片是否有轻微阴影和圆角
3. 颜色对比度是否合适
4. 整体布局是否协调

- [ ] **Step 3: 测试主题切换**

1. 切换到浅色主题
2. 验证所有组件在浅色主题下的显示效果
3. 切换回暗色主题

- [ ] **Step 4: 测试响应式布局**

1. 调整窗口大小
2. 验证布局在不同尺寸下的适应性

- [ ] **Step 5: 最终提交**

```bash
git add .
git commit -m "style: 完成扁平化UI美化，通过视觉测试"