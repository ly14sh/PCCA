<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedApi } from '@/composables/useApi'
import { fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'
import ChannelCard from '@/components/feed/ChannelCard.vue'
import ApkCard from '@/components/feed/ApkCard.vue'
import FeedSkeleton from '@/components/feed/FeedSkeleton.vue'

const route = useRoute()
const router = useRouter()
const { fetch: apiFetch } = useFeedApi()

const pageTitle = ref('')
const items = ref([])
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)

// Tab 支持
const tabs = ref([])
const activeTabUrl = ref('')

// 判断是否是话题列表页
const isTopicList = computed(() => {
  const url = activeTabUrl.value || route.query.url || ''
  return url.includes('topic/tagList') || url.includes('V11_VERTICAL_TOPIC')
})

// 判断是否是话题详情列表（从 tagList 点进来的）
const isTopicDetailList = computed(() => {
  const url = activeTabUrl.value || route.query.url || ''
  return url.includes('/topic/tagList') && url.includes('keywords')
})

async function loadContent(reset = true) {
  if (reset) {
    page.value = 1
    items.value = []
  }
  loading.value = true
  const pageName = activeTabUrl.value || route.query.url || ''
  pageTitle.value = route.query.title || ''

  try {
    let allData = []

    // 如果是话题列表，用 tagList API
    if (pageName.includes('/topic/tagList')) {
      const params = new URLSearchParams(pageName.split('?')[1] || '')
      const keywords = params.get('keywords') || ''
      const tagType = params.get('tagType') || params.get('sort') || 'hot'
      const res = await apiFetch(`/v6/topic/tagList?keywords=${encodeURIComponent(keywords)}&tagType=${tagType}&page=${page.value}`)
      allData = res.data || []
    }
    // 如果是首页话题 tab (V11_VERTICAL_TOPIC)
    else if (pageName.includes('V11_VERTICAL_TOPIC')) {
      const res = await apiFetch(`/v6/page/dataList?url=${encodeURIComponent(pageName)}&page=${page.value}`)
      allData = res.data || []

      // 提取 tab 栏
      if (reset && tabs.value.length === 0) {
        const tabCard = allData.find(i => i.entityTemplate === 'iconTabLinkGridCard')
        if (tabCard && tabCard.entities) {
          tabs.value = tabCard.entities
          // 默认选中第一个有 URL 的 tab
          const firstTab = tabCard.entities.find(e => e.url)
          if (firstTab) {
            activeTabUrl.value = firstTab.url
            loading.value = false
            return loadContent(true)
          }
        }
      }
    }
    // 普通页面
    else {
      const res = await apiFetch(`/v6/page/dataList?url=${encodeURIComponent(pageName)}&page=${page.value}`)
      allData = res.data || []

      // 检查是否有 iconTabLinkGridCard（子 tab）
      if (reset && tabs.value.length === 0) {
        const tabCard = allData.find(i => i.entityTemplate === 'iconTabLinkGridCard')
        if (tabCard && tabCard.entities && tabCard.entities.length > 0) {
          tabs.value = tabCard.entities
          activeTabUrl.value = tabCard.entities[0].url || ''
          if (activeTabUrl.value && activeTabUrl.value !== pageName) {
            loading.value = false
            return loadContent(true)
          }
        }
      }
    }

    const data = allData.filter(i => {
      if (i.entityTemplate === 'iconTabLinkGridCard' || i.entityTemplate === 'verticalColumnsFullPageCard') return false
      if (i.entityType === 'verticalColumnsFullPage' || i.entityType === 'configCard') return false
      if (i.entityType === 'feed' || i.entityType === 'apk' || i.entityType === 'topic') return true
      if (i.entityType === 'card') return true
      return false
    })
    if (data.length === 0) hasMore.value = false
    items.value = reset ? data : [...items.value, ...data]
  } catch (e) {
    console.error('PageChannel load error:', e)
  }
  loading.value = false
}

function switchTab(tab) {
  activeTabUrl.value = tab.url
  loadContent(true)
}

function loadMore() {
  page.value++
  loadContent(false)
}

function openTopic(tag) {
  if (tag) router.push(`/topic/${tag}`)
}

onMounted(() => loadContent())
watch(() => route.query.url, () => {
  tabs.value = []
  activeTabUrl.value = ''
  loadContent()
})
</script>

<template>
  <div class="page-channel">
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <h3 class="page-title">{{ pageTitle }}</h3>
    </div>

    <!-- Tab 栏 -->
    <div v-if="tabs.length > 0" class="tab-bar">
      <button
        v-for="(tab, idx) in tabs"
        :key="tab.title"
        class="tab-item"
        :class="{ active: activeTabUrl === tab.url || activeTabUrl.includes(tab.title) }"
        @click="switchTab(tab)"
      >{{ tab.title }}</button>
    </div>

    <div class="page-content">
      <FeedSkeleton v-if="loading && items.length === 0" :count="5" />

      <template v-else>
        <!-- 话题网格 -->
        <div v-if="isTopicDetailList || (items.length > 0 && items[0]?.entityType === 'topic')" class="topic-grid">
          <div
            v-for="item in items"
            :key="item.id || item.tag || Math.random()"
            class="topic-grid-card"
            @click="openTopic(item.tag || item.title)"
          >
            <img v-if="item.logo" :src="fixImgUrl(item.logo)" class="topic-grid-logo" @error="$event.target.style.display='none'">
            <div v-else class="topic-grid-placeholder">💬</div>
            <div class="topic-grid-info">
              <div class="topic-grid-title">{{ item.title || item.tag }}</div>
              <div class="topic-grid-meta">{{ item.description || '' }}</div>
              <div v-if="item.feedNum" class="topic-grid-count">{{ item.feedNum }} 动态</div>
            </div>
          </div>
        </div>

        <!-- 普通内容 -->
        <template v-else>
          <template v-for="item in items" :key="item.id || Math.random()">
            <FeedCard v-if="item.entityType === 'feed'" :item="item" />
            <ChannelCard v-else-if="item.entityType === 'card'" :item="item" />
            <ApkCard v-else-if="item.entityType === 'apk'" :item="item" />
          </template>
        </template>

        <div v-if="items.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无内容</div>
        </div>

        <button v-if="hasMore && items.length > 0" class="load-more-btn" @click="loadMore">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>

        <div v-if="!hasMore && items.length > 0" class="no-more">
          —— 没有更多了 ——
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-channel {
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

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.tab-item {
  background: var(--bg-tertiary);
  border: none;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-item:hover {
  background: var(--bg-hover);
}

.tab-item.active {
  background: var(--accent);
  color: white;
}

/* 话题网格 */
.topic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.topic-grid-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  gap: 12px;
  align-items: center;
}

.topic-grid-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.topic-grid-logo {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  object-fit: cover;
  flex-shrink: 0;
}

.topic-grid-placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.topic-grid-info {
  flex: 1;
  min-width: 0;
}

.topic-grid-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-grid-meta {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-grid-count {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}

.load-more-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-top: 12px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius);
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.load-more-btn:hover {
  background: var(--bg-hover);
}

.no-more {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
