# PCCA - 酷安第三方桌面客户端

第三方酷安桌面客户端，基于 Electron 开发。

## 功能特性

- 📱 首页资讯流 - 支持头条、关注、广场等多个 Tab
- 🔍 搜索功能 - 历史记录、多类型搜索、候选词
- 🎨 主题切换 - 暗色/浅色模式
- 🔐 账号登录 - WebView 方式，支持酷安账号
- 💬 评论互动 - 查看动态详情和评论

## 技术栈

- **Electron** - 跨平台桌面框架
- **酷安私有 API** - 社区逆向 API（V2 Token 认证）
- **coolapk-img://** - 自定义协议解决 CDN UA 限制

## 安装使用

### 从源码运行

```bash
# 安装依赖
npm install

# 开发模式
npm start

# 打包 Windows 版
npm run build:win
```

### 下载安装包

见 [Releases](https://github.com/ly14sh/PCCA/releases) 页面。

## 登录说明

PCCA 使用 WebView 方式加载酷安官方登录页面：
- 点击顶部「登录」按钮
- 在弹出窗口中完成登录
- 登录成功后自动关闭窗口并同步状态

## 注意事项

- 本项目仅供学习交流使用
- API 接口来自社区逆向项目
- 请勿用于商业用途

## 致谢

- [Coolapk-UWP](https://github.com/Coolapk-UWP/Coolapk-API-Collect) - API 文档参考
- [c001apk](https://github.com/c001apk) - 首页架构参考

## License

MIT
