<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useFeedApi, useInitApi } from '@/composables/useApi'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'
import FeedSkeleton from '@/components/feed/FeedSkeleton.vue'
import ChannelCard from '@/components/feed/ChannelCard.vue'
import ApkCard from '@/components/feed/ApkCard.vue'

const router = useRouter()
const { getFeed, getHeadline, fetch: apiFetch } = useFeedApi()
const { getInit } = useInitApi()

const tabs = ref([])
const currentTab = ref(1) // 默认头条（与原版一致）
const feedList = ref([])
const feedPage = ref(1)
const containerRef = ref(null)
const topicTabs = ref([]) // 话题子 tab
const activeTopicTab = ref(0) // 当前选中的话题 tab

const { isLoading, hasMore, reset: resetScroll } = useInfiniteScroll(containerRef, {
  threshold: 300,
  onLoadMore: async () => {
    feedPage.value++
    await loadTabContent(false)
  },
})

// 加载首页 Tab
async function loadTabs() {
  try {
    const res = await getInit()
    const configCard = (res.data || []).find(d => d.entityTemplate === 'configCard')
    if (configCard && configCard.entities) {
      tabs.value = configCard.entities.filter(e => e.page_visibility !== 0)
    }
  } catch {}

  if (tabs.value.length === 0) {
    tabs.value = [
      { title: '关注', url: '/page?url=V9_HOME_TAB_FOLLOW', page_name: 'V9_HOME_TAB_FOLLOW' },
      { title: '头条', url: '/main/headline', page_name: 'V9_HOME_TAB_HEADLINE' },
      { title: '热榜', url: '/page?url=V9_HOME_TAB_RANKING', page_name: 'V9_HOME_TAB_RANKING' },
      { title: '话题', url: '/page?url=V11_VERTICAL_TOPIC', page_name: 'V11_VERTICAL_TOPIC' },
      { title: '数码', url: '/page?url=V11_HOME_NEW', page_name: 'V11_HOME_NEW' },
    ]
  }
}

// 加载当前 Tab 内容
async function loadTabContent(reset = true) {
  if (reset) {
    feedPage.value = 1
    feedList.value = []
    resetScroll()
  }

  const tab = tabs.value[currentTab.value]
  if (!tab) return

  try {
    let res
    if (tab.url && tab.url.includes('/main/headline')) {
      // 头条用 indexV8（原版逻辑）
      res = await getFeed(feedPage.value)
    } else if (tab.url && tab.url.startsWith('/page?url=')) {
      const pageName = tab.url.replace('/page?url=', '')
      res = await apiFetch(`/v6/page/dataList?url=${encodeURIComponent(pageName)}&page=${feedPage.value}`)
    } else {
      res = await getFeed(feedPage.value)
    }

    // 话题 tab (V11_VERTICAL_TOPIC): 提取子 tab 并加载第一个 tab 的内容
    if (tab.url && tab.url.includes('V11_VERTICAL_TOPIC') && feedPage.value === 1) {
      const allItems = (res.data || [])
      const tabCard = allItems.find(i => i.entityTemplate === 'verticalColumnsFullPageCard' || i.entityTemplate === 'iconTabLinkGridCard')
      if (tabCard && tabCard.entities) {
        topicTabs.value = tabCard.entities
        const firstTab = tabCard.entities.find(e => e.url)
        if (firstTab) {
          const hashPart = firstTab.url.includes('#') ? firstTab.url.split('#')[1] : firstTab.url
          const params = new URLSearchParams(hashPart.split('?')[1] || '')
          const keywords = params.get('keywords') || ''
          const tagType = params.get('tagType') || params.get('sort') || 'hot'
          const topicRes = await apiFetch(`/v6/topic/tagList?keywords=${encodeURIComponent(keywords)}&tagType=${tagType}&page=${feedPage.value}`)
          const topics = (topicRes.data || []).filter(i => i.entityType === 'topic')
          if (topics.length === 0) hasMore.value = false
          feedList.value = topics
          return
        }
      }
    }

    const items = (res.data || []).filter(i => {
      if (i.entityTemplate === 'iconTabLinkGridCard' || i.entityTemplate === 'verticalColumnsFullPageCard') return false
      if (i.entityType === 'verticalColumnsFullPage' || i.entityType === 'configCard') return false
      return i.entityType === 'feed' || i.entityType === 'apk' || i.entityType === 'card'
    })
    if (items.length === 0) hasMore.value = false
    feedList.value = reset ? items : [...feedList.value, ...items]
  } catch (e) {
    console.error('Tab load error:', e)
  }
}

// 切换 Tab
function switchTab(index) {
  currentTab.value = index
  topicTabs.value = []
  activeTopicTab.value = 0
  loadTabContent(true)
}

// 切换话题子 tab
async function switchTopicTab(index) {
  activeTopicTab.value = index
  const tab = topicTabs.value[index]
  if (!tab || !tab.url) return
  feedPage.value = 1
  try {
    let data = []
    const url = tab.url
    if (url.startsWith('/t/')) {
      // /t/话题名 → 打开话题详情
      router.push(`/topic/${decodeURIComponent(url.replace('/t/', ''))}`)
      return
    } else if (url.startsWith('/page?url=')) {
      // /page?url=XXX → 请求 dataList
      const pn = url.replace('/page?url=', '')
      const res = await apiFetch(`/v6/page/dataList?url=${encodeURIComponent(pn)}&page=1`)
      data = (res.data || []).filter(i => i.entityTemplate !== 'verticalColumnsFullPageCard' && i.entityTemplate !== 'configCard')
    } else if (url.startsWith('#')) {
      // 所有 # 开头的URL都通过 /v6/page/dataList?url= 请求（原版逻辑）
      const res = await apiFetch(`/v6/page/dataList?url=${encodeURIComponent(url)}&page=1`)
      data = (res.data || []).filter(i => i.entityTemplate !== 'verticalColumnsFullPageCard' && i.entityTemplate !== 'configCard')
    } else {
      // 其他：直接调 tagList
      const hashPart = url.split('#')[1] || url
      const params = new URLSearchParams(hashPart.split('?')[1] || '')
      const keywords = params.get('keywords') || ''
      const tagType = params.get('tagType') || params.get('sort') || 'hot'
      const res = await apiFetch(`/v6/topic/tagList?keywords=${encodeURIComponent(keywords)}&tagType=${tagType}&page=1`)
      data = res.data || []
    }
    feedList.value = data
    hasMore.value = data.length > 0
  } catch (e) {
    console.error('Topic load error:', e)
  }
}

onMounted(async () => {
  await loadTabs()
  await loadTabContent(true)
})
</script>

<template>
  <div class="home-page">
    <!-- Tab 栏 -->
    <div class="home-tabs" v-if="tabs.length > 0">
      <button
        v-for="(tab, i) in tabs"
        :key="i"
        class="home-tab"
        :class="{ active: currentTab === i }"
        @click="switchTab(i)"
      >
        {{ tab.title }}
      </button>
    </div>

    <!-- 话题子 tab -->
    <div v-if="topicTabs.length > 0" class="topic-tabs">
      <button
        v-for="(tab, i) in topicTabs"
        :key="tab.title"
        class="topic-tab"
        :class="{ active: activeTopicTab === i }"
        @click="switchTopicTab(i)"
      >{{ tab.title }}</button>
    </div>

    <!-- 内容区 -->
    <div class="home-content" ref="containerRef">
      <!-- 骨架屏 -->
      <FeedSkeleton v-if="isLoading && feedList.length === 0" :count="5" />

      <!-- Feed 列表 -->
      <template v-else>
        <template v-for="item in feedList" :key="item.id || Math.random()">
          <!-- Feed 卡片 -->
          <FeedCard v-if="item.entityType === 'feed'" :item="item" />

          <!-- 频道卡片 -->
          <ChannelCard v-else-if="item.entityType === 'card'" :item="item" />

          <!-- 应用卡片 -->
          <ApkCard v-else-if="item.entityType === 'apk'" :item="item" />

          <!-- 话题卡片 -->
          <div v-else-if="item.entityType === 'topic'" class="topic-card" @click="router.push(`/topic/${item.tag || item.title}`)">
            <img v-if="item.logo" :src="fixImgUrl(item.logo)" class="topic-card-logo" @error="$event.target.style.display='none'">
            <div v-else class="topic-card-placeholder">💬</div>
            <div class="topic-card-info">
              <div class="topic-card-title">{{ item.title || item.tag }}</div>
              <div class="topic-card-meta">{{ item.description || '' }} {{ item.feedNum ? '· ' + item.feedNum + '动态' : '' }}</div>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <div v-if="feedList.length === 0 && !isLoading" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无内容</div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading && feedList.length > 0" class="loading-more">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <!-- 没有更多 -->
        <div v-if="!hasMore && feedList.length > 0" class="no-more">
          —— 没有更多了 ——
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.home-tabs {
  display: flex;
  gap: 0;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
  overflow-x: auto;
}

.home-tab {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.home-tab:hover {
  color: var(--text-primary);
}

.home-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.home-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.no-more {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 话题子 tab */
.topic-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
  overflow-x: auto;
}

.topic-tab {
  background: var(--bg-tertiary);
  border: none;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.topic-tab:hover {
  background: var(--bg-hover);
}

.topic-tab.active {
  background: var(--accent);
  color: white;
}

/* 话题卡片 */
.topic-card {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s ease;
  align-items: center;
}

.topic-card:hover {
  border-color: var(--accent);
}

.topic-card-logo {
  width: 52px;
  height: 52px;
  border-radius: var(--radius);
  object-fit: cover;
  flex-shrink: 0;
}

.topic-card-placeholder {
  width: 52px;
  height: 52px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.topic-card-info {
  flex: 1;
  min-width: 0;
}

.topic-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card-meta {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
