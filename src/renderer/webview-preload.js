// WebView 预加载脚本 — 注入桌面适配 CSS

// 暗色主题 CSS
const darkThemeCSS = `
  /* 隐藏底部 APP 下载栏 */
  .app-download-bar, .download-bar, [class*="download"] { display: none !important; }
  
  /* 隐藏顶部 APP 横幅 */
  .app-banner, .open-app-btn, [class*="openApp"] { display: none !important; }
  
  /* 适配桌面宽度 */
  body { max-width: 900px !important; margin: 0 auto !important; }
  
  /* 暗色主题 */
  :root {
    --bg-primary: #1a1a2e !important;
    --bg-secondary: #16213e !important;
    --bg-card: #1f2940 !important;
    --text-primary: #ffffff !important;
    --text-secondary: #b0b0b0 !important;
    --accent: #0DC26F !important;
  }
  
  body, .page, .container { background: #1a1a2e !important; }
  .card, .feed-card, .item-card { background: #1f2940 !important; }
  .title, .content, .name, .username { color: #ffffff !important; }
  .desc, .summary, .info { color: #b0b0b0 !important; }
  
  /* 滚动条样式 */
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #16213e; }
  ::-webkit-scrollbar-thumb { background: #3a3a5a; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #4a4a6a; }
`;

// 浅色主题 CSS（仅隐藏下载栏）
const lightThemeCSS = `
  .app-download-bar, .download-bar, [class*="download"] { display: none !important; }
  .app-banner, .open-app-btn, [class*="openApp"] { display: none !important; }
  body { max-width: 900px !important; margin: 0 auto !important; }
`;

// 注入 CSS
function injectCSS() {
  const isDark = localStorage.getItem('kuan-theme') !== 'light';
  const css = isDark ? darkThemeCSS : lightThemeCSS;
  
  const style = document.createElement('style');
  style.id = 'pcca-injected-style';
  style.textContent = css;
  document.head.appendChild(style);
  
  console.log('[PCCA WebView] CSS injected, theme:', isDark ? 'dark' : 'light');
}

// DOM 加载完成后注入
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectCSS);
} else {
  injectCSS();
}

// 监听主题变化消息
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'theme-change') {
    const style = document.getElementById('pcca-injected-style');
    if (style) {
      const isDark = event.data.dark;
      style.textContent = isDark ? darkThemeCSS : lightThemeCSS;
      console.log('[PCCA WebView] Theme changed to:', isDark ? 'dark' : 'light');
    }
  }
});

// 拦截打开 APP 按钮，改为在当前页跳转
document.addEventListener('click', (e) => {
  const target = e.target.closest('a[href^="coolapk://"]');
  if (target) {
    e.preventDefault();
    const href = target.getAttribute('href');
    console.log('[PCCA WebView] Blocked coolapk:// link:', href);
    // 可以发送消息给主进程处理
    window.postMessage({ type: 'deep-link', url: href }, '*');
  }
}, true);
