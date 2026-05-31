<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserApi } from '@/composables/useApi'
import { formatTime, formatNum, fixImgUrl, decodeUser } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'

const route = useRoute()
const router = useRouter()
const { getUserSpace, getUserFeedList, getUserReplyList, followUser, unfollowUser } = useUserApi()

const user = ref(null)
const feeds = ref([])
const loading = ref(true)
const activeTab = ref('feed')
const page = ref(1)

const levelPercent = computed(() => {
  if (!user.value) return 0
  if (user.value.next_level_percentage) return parseFloat(user.value.next_level_percentage)
  const exp = user.value.experience || 0
  const nextExp = user.value.next_level_experience || 100
  return Math.min(100, Math.round((exp / nextExp) * 100))
})

async function loadUser() {
  loading.value = true
  try {
    const uid = route.params.uid
    const spaceRes = await getUserSpace(uid)
    user.value = spaceRes.data || {}
    await loadTab('feed', true)
  } catch (e) {
    console.error('Load user error:', e)
  } finally {
    loading.value = false
  }
}

async function loadTab(tab, reset = false) {
  activeTab.value = tab
  if (reset) {
    page.value = 1
    feeds.value = []
  }
  try {
    const uid = route.params.uid
    const res = tab === 'feed'
      ? await getUserFeedList(uid, page.value)
      : await getUserReplyList(uid, page.value)
    const items = res.data || []
    feeds.value = reset ? items : [...feeds.value, ...items]
  } catch {}
}

async function handleFollow() {
  if (!user.value) return
  try {
    if (user.value.isFollow) {
      await unfollowUser(user.value.uid)
      user.value.isFollow = 0
    } else {
      await followUser(user.value.uid)
      user.value.isFollow = 1
    }
  } catch {}
}

onMounted(loadUser)
watch(() => route.params.uid, loadUser)
</script>

<template>
  <div class="user-page">
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <span class="page-title">用户详情</span>
    </div>
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else-if="user">
      <!-- 用户信息头部 -->
      <div class="user-header">
        <div class="user-avatar">
          <img v-if="user.userAvatar" :src="fixImgUrl(user.userAvatar)" @error="$event.target.style.display='none'">
          <span v-else>{{ (user.username || '?')[0] }}</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ decodeUser(user.username || '') }}</div>
          <div v-if="user.level" class="user-level">
            <span class="level-badge">Lv.{{ user.level }}</span>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: levelPercent + '%' }"></div>
            </div>
            <span class="level-exp">{{ user.experience || 0 }}/{{ user.next_level_experience || 100 }}</span>
          </div>
          <div class="user-bio">{{ user.bio || '暂无简介' }}</div>
          <div class="user-stats">
            <span>关注 {{ formatNum(user.follow || 0) }}</span>
            <span>粉丝 {{ formatNum(user.fans || 0) }}</span>
            <span>动态 {{ formatNum(user.feed || 0) }}</span>
            <span>回复 {{ formatNum(user.replyNum || 0) }}</span>
            <span>被赞 {{ formatNum(user.be_like_num || 0) }}</span>
          </div>
        </div>
        <button class="follow-btn" :class="{ followed: user.isFollow }" @click="handleFollow">
          {{ user.isFollow ? '已关注' : '+ 关注' }}
        </button>
      </div>

      <!-- Tab 栏 -->
      <div class="user-tabs">
        <button :class="{ active: activeTab === 'feed' }" @click="loadTab('feed', true)">动态</button>
        <button :class="{ active: activeTab === 'reply' }" @click="loadTab('reply', true)">回复</button>
      </div>

      <!-- 动态列表 -->
      <div class="user-feeds">
        <template v-for="item in feeds" :key="item.id">
          <FeedCard v-if="item.entityType === 'feed'" :item="item" />
          <div v-else class="feed-item" @click="router.push(`/feed/${item.id || item.fid}`)">
            <div class="feed-text">{{ (item.message || '').replace(/<[^>]+>/g, '').substring(0, 120) }}</div>
            <div class="feed-time">{{ formatTime(item.dateline) }}</div>
          </div>
        </template>
        <div v-if="feeds.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无{{ activeTab === 'feed' ? '动态' : '回复' }}</div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">用户不存在</div>
    </div>
  </div>
</template>

<style scoped>
.user-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
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

.user-header {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar span {
  font-size: 24px;
  color: var(--text-secondary);
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.user-level {
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

.user-bio {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.user-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.follow-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.follow-btn.followed {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.user-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.user-tabs button {
  padding: 10px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.user-tabs button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.feed-item {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.feed-item:hover {
  border-color: var(--accent);
}

.feed-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 6px;
}

.feed-time {
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
