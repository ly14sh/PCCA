<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageApi } from '@/composables/useApi'
import { formatTime, fixImgUrl } from '@/utils/format'

const router = useRouter()
const { getNotificationList, getMessageList, readNotification } = useMessageApi()

const activeTab = ref('notification')
const items = ref([])
const loading = ref(true)

// 通知类型图标映射
const typeIcons = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  reply: '↩️',
  at: '@',
  system: '🔔',
  feed: '📝',
}

function getNotifyIcon(item) {
  const type = item.type || item.entityType || ''
  if (type.includes('like')) return '❤️'
  if (type.includes('comment') || type.includes('reply')) return '💬'
  if (type.includes('follow')) return '👤'
  if (type.includes('at')) return '@'
  return '🔔'
}

function getNotifyType(item) {
  const type = item.type || item.entityType || ''
  if (type.includes('like')) return '点赞'
  if (type.includes('comment') || type.includes('reply')) return '评论'
  if (type.includes('follow')) return '关注'
  if (type.includes('at')) return '提到你'
  return '通知'
}

async function loadMessages(type) {
  activeTab.value = type
  loading.value = true
  try {
    const res = type === 'notification'
      ? await getNotificationList(1)
      : await getMessageList(1)
    items.value = res.data || []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function openItem(item) {
  // 标记已读
  if (item.id && !item.isRead) {
    try {
      await readNotification(item.id)
      item.isRead = 1
    } catch {}
  }

  // 跳转
  if (item.feedId || item.entityId) {
    router.push(`/feed/${item.feedId || item.entityId}`)
  } else if (item.uid) {
    router.push(`/user/${item.uid}`)
  }
}

function openConversation(item) {
  if (item.uid) {
    router.push(`/messages/${item.uid}`)
  }
}

onMounted(() => loadMessages('notification'))
</script>

<template>
  <div class="messages-page">
    <!-- Tab 栏 -->
    <div class="msg-tabs">
      <button :class="{ active: activeTab === 'notification' }" @click="loadMessages('notification')">
        🔔 通知
      </button>
      <button :class="{ active: activeTab === 'message' }" @click="loadMessages('message')">
        💬 私信
      </button>
    </div>

    <!-- 内容 -->
    <div class="msg-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <template v-else>
        <div v-if="items.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无{{ activeTab === 'notification' ? '通知' : '私信' }}</div>
        </div>

        <!-- 通知列表 -->
        <template v-if="activeTab === 'notification'">
          <div
            v-for="item in items"
            :key="item.id"
            class="notify-item"
            :class="{ unread: !item.isRead }"
            @click="openItem(item)"
          >
            <div class="notify-icon">{{ getNotifyIcon(item) }}</div>
            <div class="notify-avatar">
              <img v-if="item.fromUserAvatar" :src="fixImgUrl(item.fromUserAvatar)" @error="$event.target.style.display='none'">
              <span v-else>{{ (item.fromUserName || '?')[0] }}</span>
            </div>
            <div class="notify-info">
              <div class="notify-header">
                <span class="notify-name">{{ item.fromUserName || '系统' }}</span>
                <span class="notify-type">{{ getNotifyType(item) }}</span>
                <span class="notify-time">{{ formatTime(item.dateline) }}</span>
              </div>
              <div class="notify-text">{{ item.message || item.title || '' }}</div>
            </div>
            <div v-if="!item.isRead" class="unread-dot"></div>
          </div>
        </template>

        <!-- 私信列表 -->
        <template v-if="activeTab === 'message'">
          <div
            v-for="item in items"
            :key="item.id"
            class="message-item"
            @click="openConversation(item)"
          >
            <div class="msg-avatar">
              <img v-if="item.fromUserAvatar" :src="fixImgUrl(item.fromUserAvatar)" @error="$event.target.style.display='none'">
              <span v-else>{{ (item.fromUserName || '?')[0] }}</span>
            </div>
            <div class="msg-info">
              <div class="msg-header">
                <span class="msg-name">{{ item.fromUserName || '系统' }}</span>
                <span class="msg-time">{{ formatTime(item.dateline) }}</span>
              </div>
              <div class="msg-text">{{ item.message || item.title || '' }}</div>
            </div>
            <div v-if="item.unreadCount" class="msg-badge">{{ item.unreadCount }}</div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.messages-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.msg-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.msg-tabs button {
  padding: 10px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.msg-tabs button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px;
  color: var(--text-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 通知项 */
.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-bottom: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.notify-item:hover {
  border-color: var(--accent);
}

.notify-item.unread {
  background: rgba(var(--accent-rgb), 0.03);
  border-color: rgba(var(--accent-rgb), 0.2);
}

.notify-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notify-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notify-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notify-avatar span {
  font-size: 14px;
  color: var(--text-secondary);
}

.notify-info {
  flex: 1;
  min-width: 0;
}

.notify-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.notify-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.notify-type {
  font-size: 11px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.notify-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

.notify-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 6px;
}

/* 私信项 */
.message-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-bottom: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.message-item:hover {
  border-color: var(--accent);
}

.msg-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-avatar span {
  font-size: 16px;
  color: var(--text-secondary);
}

.msg-info {
  flex: 1;
  min-width: 0;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.msg-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.msg-time {
  font-size: 12px;
  color: var(--text-muted);
}

.msg-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-badge {
  background: var(--red);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 60px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
