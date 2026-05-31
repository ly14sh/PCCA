# PCCA v3.0.0 — 酷安第三方桌面客户端

> 基于 Vue 3 + Vite + Electron + Tailwind CSS 重构

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Vite + Electron）
npm run dev

# 构建 Windows 可执行文件
npm run build:win
```

## 技术栈

- **前端框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **桌面壳**: Electron 37
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **CSS**: Tailwind CSS
- **API**: 酷安 API（复用原有 coolapk.js）

## 项目结构

```
PCCA-v3/
├── electron/           # Electron 主进程
│   ├── main.js         # 主进程入口
│   ├── preload.js      # IPC 桥接
│   └── coolapk.js      # API 模块引用
├── src/
│   ├── api/            # 酷安 API（原版复用）
│   ├── composables/    # Vue composables（useApi）
│   ├── stores/         # Pinia 状态管理
│   ├── router/         # Vue Router 路由
│   ├── components/     # Vue 组件
│   │   ├── layout/     # 布局组件（侧边栏、顶栏）
│   │   └── feed/       # Feed 相关组件
│   ├── views/          # 页面视图
│   ├── utils/          # 工具函数
│   ├── assets/         # 静态资源
│   └── renderer/       # 酷安表情资源（515个）
├── index.html          # 入口 HTML
├── vite.config.js      # Vite 配置
├── tailwind.config.js  # Tailwind 配置
└── package.json
```

## 已实现功能

- ✅ 首页 Feed 流（多 Tab + 无限滚动）
- ✅ 动态详情 + 评论列表 + 排序
- ✅ 用户主页（信息 + 动态列表 + 关注）
- ✅ 搜索（5种类型 + 排序 + 搜索建议 + 历史）
- ✅ 频道页（话题/数码入口）
- ✅ 消息/通知列表
- ✅ 设置页面（登录/主题/缓存/设备码）
- ✅ 话题详情页
- ✅ 骨架屏加载
- ✅ 暗色/亮色主题切换
- ✅ WebView 登录

## 待实现功能

详见 ROADMAP.md 和 TASKS.md
