// ===== 酷安表情映射（文本 → Unicode Emoji） =====
const COOLAPK_EMOJI = {
  '受虐滑稽': '😅', '笑哭': '😂', '吃瓜': '🍉', '耐克嘴': '😏',
  '流泪': '😢', '哈哈': '😄', '滑稽': '😏', '阴险': '😈',
  '怒': '😡', '酷': '😎', '惊哭': '😱', '大哭': '😭',
  '偷笑': '🤭', '委屈': '🥺', '疑问': '❓', '吐': '🤮',
  '黑线': '😑', '鄙视': '😒', '怒骂': '🤬', '打脸': '🤦',
  '真棒': '👍', '捂脸': '🤦', '笑眼': '😊', '思考': '🤔',
  '睡觉': '😴', '钱': '💰', '害羞': '😳', '晕': '😵',
  '骷髅': '💀', '便便': '💩', '幽灵': '👻', '爱心': '❤️',
  '心碎': '💔', '星星': '⭐', '太阳': '☀️', '月亮': '🌙',
  '礼物': '🎁', '彩虹': '🌈', '音乐': '🎵', '点赞': '👍',
  '踩': '👎', '握手': '🤝', '拳头': '✊', '胜利': '✌️',
  'doge': '🐕', '二哈': '狼', '666': '🔥', 'yyds': '👑',
}

// 表情文件名列表（由 emoji-files.js 注入）
let EMOJI_FILES = {}

export function setEmojiFiles(files) {
  EMOJI_FILES = files || {}
}

export function renderEmoji(text) {
  if (!text) return ''
  // 本地图片表情 [xxx] 或 (xxx)
  let result = text
    .replace(/\[([^\]]+)\]/g, (match, name) => {
      const file = EMOJI_FILES[name]
      if (!file) return match
      return `<img class="emoji" src="emoji://${file}" alt="${match}" title="${match}" onerror="this.style.display='none'">`
    })
    .replace(/\(([^)]+)\)/g, (match, name) => {
      const file = EMOJI_FILES[name]
      if (!file) return match
      return `<img class="emoji" src="emoji://${file}" alt="${match}" title="${match}" onerror="this.style.display='none'">`
    })
  return result
}
