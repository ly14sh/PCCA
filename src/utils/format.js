// ===== 时间格式化 =====
export function formatTime(ts) {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 2592000) return Math.floor(diff / 86400) + '天前'
  const d = new Date(ts * 1000)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

// ===== 数字格式化 =====
export function formatNum(num) {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

// ===== HTML 转义 =====
export function esc(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ===== 图片 URL 代理 =====
export function fixImgUrl(url) {
  if (!url) return url
  return url.replace(/^https?:\/\/(image|avatar|feed)\.coolapk\.com/i, 'coolapk-img://$1.coolapk.com')
}

// ===== 解码用户名 =====
export function decodeUser(str) {
  try { return decodeURIComponent(str || '') } catch { return str || '' }
}
