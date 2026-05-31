<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useFeedApi, useUserApi } from '@/composables/useApi'
import { formatTime, formatNum, fixImgUrl, decodeUser } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'
import LoginModal from '@/components/login/LoginModal.vue'

const router = useRouter()
const userStore = useUserStore()
const { getMyFeedList, getFollowFeedList } = useFeedApi()
const { getUserSpace } = useUserApi()

const activeTab = ref('my')
const items = ref([])
const loading = ref(true)
const page = ref(1)
const showLogin = ref(false)
const userInfo = ref(null)

const levelPercent = computed(() => {
  if (!userInfo.value) return 0
  // API 直接返回了百分比
  if (userInfo.value.next_level_percentage) return parseFloat(userInfo.value.next_level_percentage)
  const exp = userInfo.value.experience || 0
  const nextExp = userInfo.value.next_level_experience || 100
  return Math.min(100, Math.round((exp / nextExp) * 100))
})

const tabs = [
  { key: 'my', label: '我的动态', icon: '📝' },
  { key: 'follow', label: '关注', icon: '👥' },
  { key: 'history', label: '浏览历史', icon: '🕐' },
]

async function loadTab(tab, reset = false) {
  activeTab.value = tab
  if (reset) {
    page.value = 1
    items.value = []
  }
  loading.value = true

  try {
    if (tab === 'my') {
      const res = await getMyFeedList(page.value)
      console.log('[MyProfile] my feed response:', res)
      const items_raw = res.data || []
      console.log('[MyProfile] first item keys:', items_raw[0] ? Object.keys(items_raw[0]).join(', ') : 'empty')
      console.log('[MyProfile] first item entityType:', items_raw[0]?.entityType, 'type:', items_raw[0]?.type)
      items.value = items_raw
    } else if (tab === 'follow') {
      const res = await getFollowFeedList(page.value)
      console.log('[MyProfile] follow feed response:', res)
      items.value = res.data || []
    } else if (tab === 'history') {
      // 本地浏览历史
      try {
        items.value = JSON.parse(localStorage.getItem('pcca_history') || '[]')
      } catch {
        items.value = []
      }
    }
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadUserInfo() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await getUserSpace(userStore.uid)
    userInfo.value = res.data || {}
    // Debug: print all keys
    const d = userInfo.value
    console.log('[MyProfile] user space ALL keys:', Object.keys(d).join(', '))
    console.log('[MyProfile] user space data:', JSON.stringify(d, null, 2))
  } catch {}
}

function openLogin() {
  showLogin.value = true
}

function onLoginSuccess() {
  loadUserInfo()
  loadTab('my', true)
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await loadUserInfo()
    await loadTab('my', true)
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="profile-page">
    <!-- 未登录 -->
    <div v-if="!userStore.isLoggedIn" class="login-prompt">
      <div class="prompt-icon">🔑</div>
      <h3>登录后查看个人中心</h3>
      <p>登录后可以查看动态、收藏、历史等</p>
      <button class="btn-primary" @click="openLogin">去登录</button>
    </div>

    <template v-else>
      <!-- 用户信息 -->
      <div class="profile-header">
        <div class="profile-avatar">
          <img v-if="userInfo?.userAvatar" :src="fixImgUrl(userInfo.userAvatar)" @error="$event.target.style.display='none'">
          <span v-else>{{ (userStore.username || '?')[0] }}</span>
        </div>
        <div class="profile-info">
          <div class="profile-name">{{ decodeUser(userStore.username) }}</div>
          <div v-if="userInfo?.level" class="profile-level">
            <span class="level-badge">Lv.{{ userInfo.level }}</span>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: levelPercent + '%' }"></div>
            </div>
            <span class="level-exp">{{ userInfo.experience || 0 }}/{{ userInfo.next_level_experience || 100 }}</span>
          </div>
          <div class="profile-bio">{{ userInfo?.bio || '暂无简介' }}</div>
          <div class="profile-stats">
            <span @click="router.push(`/user/${userStore.uid}`)">关注 {{ formatNum(userInfo?.follow || 0) }}</span>
            <span @click="router.push(`/user/${userStore.uid}`)">粉丝 {{ formatNum(userInfo?.fans || 0) }}</span>
            <span @click="router.push(`/user/${userStore.uid}`)">动态 {{ formatNum(userInfo?.feed || 0) }}</span>
            <span>回复 {{ formatNum(userInfo?.replyNum || 0) }}</span>
            <span>被赞 {{ formatNum(userInfo?.be_like_num || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Tab 栏 -->
      <div class="profile-tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="{ active: activeTab === t.key }"
          @click="loadTab(t.key, true)"
        >
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- 内容 -->
      <div class="profile-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <template v-else>
          <div v-if="items.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">暂无内容</div>
          </div>

          <template v-for="item in items" :key="item.id || Math.random()">
            <FeedCard v-if="item.entityType === 'feed'" :item="item" />
            <div v-else class="history-item" @click="router.push(`/feed/${item.id}`)">
              <div class="history-text">{{ (item.message || '').replace(/<[^>]+>/g, '').substring(0, 100) }}</div>
              <div class="history-time">{{ formatTime(item.viewTime || item.dateline) }}</div>
            </div>
          </template>
        </template>
      </div>
    </template>

    <LoginModal :visible="showLogin" @close="showLogin = false" @success="onLoginSuccess" />
  </div>
</template>

<style scoped>
.profile-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.login-prompt {
  text-align: center;
  padding: 80px 20px;
}

.prompt-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.login-prompt h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.login-prompt p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.profile-header {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar span {
  font-size: 22px;
  color: var(--text-secondary);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.profile-level {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.level-badge {
  background: var(--accent);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.level-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
  max-width: 120px;
}

.level-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.level-exp {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.profile-bio {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.profile-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.profile-stats span {
  cursor: pointer;
}

.profile-stats span:hover {
  color: var(--accent);
}

.profile-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.profile-tabs button {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.profile-tabs button.active {
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

.history-item {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.history-item:hover {
  border-color: var(--accent);
}

.history-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 40px;
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
