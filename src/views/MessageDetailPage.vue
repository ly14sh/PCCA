<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessageApi, useUserApi } from '@/composables/useApi'
import { formatTime, fixImgUrl, decodeUser } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { getMessageList } = useMessageApi()
const { getUserInfo } = useUserApi()

const messages = ref([])
const loading = ref(true)
const inputText = ref('')
const sending = ref(false)
const targetUser = ref(null)
const listRef = ref(null)

async function loadConversation() {
  loading.value = true
  try {
    const uid = route.params.uid
    // 获取对方用户信息
    const userRes = await getUserInfo(uid)
    targetUser.value = userRes.data || {}

    // 获取私信列表（复用 getMessageList，实际可能需要专门的会话 API）
    const res = await getMessageList(1)
    messages.value = (res.data || []).filter(m =>
      String(m.uid) === String(uid) || String(m.fromUid) === String(uid)
    ).reverse()

    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('Load conversation error:', e)
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!inputText.value.trim() || sending.value) return
  sending.value = true
  try {
    // 复用 postReply 发送私信（实际可能需要专门的私信 API）
    const message = inputText.value.trim()
    messages.value.push({
      id: Date.now(),
      message,
      dateline: Math.floor(Date.now() / 1000),
      isMe: true,
    })
    inputText.value = ''
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('Send message error:', e)
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

onMounted(loadConversation)
</script>

<template>
  <div class="conversation-page">
    <!-- 头部 -->
    <div class="conv-header">
      <button class="back-btn" @click="router.push('/messages')">←</button>
      <div class="conv-user">
        <div class="conv-avatar">
          <img v-if="targetUser?.userAvatar" :src="fixImgUrl(targetUser.userAvatar)" @error="$event.target.style.display='none'">
          <span v-else>{{ (targetUser?.username || '?')[0] }}</span>
        </div>
        <div class="conv-name">{{ decodeUser(targetUser?.username || '加载中...') }}</div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="conv-messages" ref="listRef">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <template v-else>
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无消息</div>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="msg-bubble"
          :class="{ 'msg-mine': msg.isMe }"
        >
          <div v-if="!msg.isMe" class="bubble-avatar">
            <img v-if="targetUser?.userAvatar" :src="fixImgUrl(targetUser.userAvatar)" @error="$event.target.style.display='none'">
            <span v-else>{{ (targetUser?.username || '?')[0] }}</span>
          </div>
          <div class="bubble-content">
            <div class="bubble-text">{{ msg.message || '' }}</div>
            <div class="bubble-time">{{ formatTime(msg.dateline) }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 输入栏 -->
    <div class="conv-input">
      <input
        v-model="inputText"
        placeholder="输入消息..."
        @keydown.enter="sendMessage"
      >
      <button @click="sendMessage" :disabled="!inputText.trim() || sending">
        {{ sending ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.conversation-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.conv-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.conv-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.conv-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.conv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conv-avatar span {
  font-size: 14px;
  color: var(--text-secondary);
}

.conv-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.conv-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

.msg-bubble {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  max-width: 70%;
}

.msg-mine {
  flex-direction: row-reverse;
  margin-left: auto;
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bubble-avatar span {
  font-size: 12px;
  color: var(--text-secondary);
}

.bubble-content {
  display: flex;
  flex-direction: column;
}

.bubble-text {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.msg-mine .bubble-text {
  background: var(--accent);
  color: white;
}

.bubble-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.msg-mine .bubble-time {
  text-align: right;
}

.conv-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.conv-input input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
}

.conv-input input:focus {
  border-color: var(--accent);
}

.conv-input button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.conv-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
