<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { renderEmoji } from '@/utils/emoji'

const props = defineProps({
  content: { type: String, default: '' },
  maxLength: { type: Number, default: 0 },
})

const router = useRouter()
const expanded = ref(false)

const plainText = computed(() => (props.content || '').replace(/<[^>]+>/g, '').trim())
const isLong = computed(() => props.maxLength > 0 && plainText.value.length > props.maxLength)
const displayText = computed(() => {
  if (!isLong.value || expanded.value) return plainText.value
  return plainText.value.substring(0, props.maxLength) + '...'
})

// 处理超链接、话题、@用户
function processText(text) {
  if (!text) return ''
  let html = escapeHtml(text)

  // 话题 #xxx#
  html = html.replace(/#([^#]+)#/g, '<a class="link-topic" data-topic="$1">#$1#</a>')

  // @用户
  html = html.replace(/@(\w+)/g, '<a class="link-user" data-user="$1">@$1</a>')

  // URL
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a class="link-url" href="$1" target="_blank">$1</a>')

  // 表情
  html = renderEmoji(html)

  return html
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function handleClick(e) {
  const target = e.target.closest('a')
  if (!target) return

  if (target.dataset.topic) {
    e.preventDefault()
    router.push(`/topic/${target.dataset.topic}`)
  } else if (target.dataset.user) {
    e.preventDefault()
    // 可以搜索用户
    router.push(`/search?keyword=${target.dataset.user}`)
  }
}
</script>

<template>
  <div class="rich-text" @click="handleClick">
    <div v-html="processText(displayText)"></div>
    <button v-if="isLong && !expanded" class="expand-btn" @click.stop="expanded = true">
      展开全文
    </button>
    <button v-if="isLong && expanded" class="expand-btn" @click.stop="expanded = false">
      收起
    </button>
  </div>
</template>

<script>
import { ref } from 'vue'
</script>

<style scoped>
.rich-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;
}

.rich-text :deep(.link-topic) {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.rich-text :deep(.link-topic:hover) {
  text-decoration: underline;
}

.rich-text :deep(.link-user) {
  color: var(--accent);
  cursor: pointer;
  text-decoration: none;
}

.rich-text :deep(.link-user:hover) {
  text-decoration: underline;
}

.rich-text :deep(.link-url) {
  color: var(--accent);
  text-decoration: none;
  word-break: break-all;
}

.rich-text :deep(.link-url:hover) {
  text-decoration: underline;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
}

.expand-btn:hover {
  text-decoration: underline;
}
</style>
