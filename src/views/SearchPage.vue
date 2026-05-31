<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchApi } from '@/composables/useApi'
import { fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'

const router = useRouter()
const { search, searchSuggest, loading } = useSearchApi()

const keyword = ref('')
const searchType = ref('feed')
const searchSort = ref('default')
const results = ref([])
const suggestItems = ref([])
const showSuggest = ref(false)
const history = ref([])
const hasSearched = ref(false)

const HISTORY_KEY = 'pcca_search_history'
const HISTORY_MAX = 20

const types = [
  { key: 'feed', label: '动态', icon: '📝' },
  { key: 'apk', label: '应用', icon: '📦' },
  { key: 'product', label: '数码', icon: '📱' },
  { key: 'user', label: '用户', icon: '👤' },
  { key: 'topic', label: '话题', icon: '💬' },
]

const sorts = [
  { key: 'default', label: '默认' },
  { key: 'dateline_desc', label: '最新' },
  { key: 'popular', label: '热门' },
]

function loadHistory() {
  try {
    history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { history.value = [] }
}

function saveHistory(kw) {
  if (!kw) return
  let h = history.value.filter(x => x !== kw)
  h.unshift(kw)
  if (h.length > HISTORY_MAX) h = h.slice(0, HISTORY_MAX)
  history.value = h
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

function clearHistory() {
  history.value = []
  localStorage.removeItem(HISTORY_KEY)
}

async function doSearch() {
  if (!keyword.value.trim()) return
  saveHistory(keyword.value.trim())
  showSuggest.value = false
  hasSearched.value = true
  try {
    const res = await search(keyword.value.trim(), 1, searchType.value, searchSort.value)
    results.value = res.data || []
  } catch {
    results.value = []
  }
}

async function onInput() {
  const kw = keyword.value.trim()
  if (!kw) {
    suggestItems.value = []
    showSuggest.value = false
    return
  }
  try {
    const res = await searchSuggest(kw)
    suggestItems.value = (res.data || []).slice(0, 8)
    showSuggest.value = true
  } catch {
    suggestItems.value = []
  }
}

function selectSuggest(item) {
  keyword.value = item.title || item.shorttitle || item.username || item.searchWord || ''
  showSuggest.value = false
  doSearch()
}

function selectHistory(kw) {
  keyword.value = kw
  doSearch()
}

onMounted(loadHistory)
</script>

<template>
  <div class="search-page">
    <!-- 搜索框 -->
    <div class="search-box">
      <input
        v-model="keyword"
        placeholder="搜索酷安..."
        @keydown.enter="doSearch"
        @input="onInput"
        @focus="showSuggest = true"
        @blur="setTimeout(() => showSuggest = false, 200)"
      >
      <button @click="doSearch" :disabled="!keyword.trim()">搜索</button>
    </div>

    <!-- 搜索建议/历史 -->
    <div class="suggest-box" v-if="showSuggest">
      <!-- 搜索建议 -->
      <template v-if="suggestItems.length > 0">
        <div
          v-for="item in suggestItems"
          :key="item.title || item.searchWord"
          class="suggest-item"
          @mousedown.prevent="selectSuggest(item)"
        >
          <span class="suggest-icon">🔍</span>
          <span class="suggest-text">{{ item.title || item.shorttitle || item.username || item.searchWord }}</span>
        </div>
      </template>

      <!-- 搜索历史 -->
      <template v-else-if="history.length > 0">
        <div class="history-header">
          <span>搜索历史</span>
          <button @mousedown.prevent="clearHistory">清除</button>
        </div>
        <div
          v-for="kw in history"
          :key="kw"
          class="suggest-item"
          @mousedown.prevent="selectHistory(kw)"
        >
          <span class="suggest-icon">🕐</span>
          <span class="suggest-text">{{ kw }}</span>
        </div>
      </template>
    </div>

    <!-- 搜索类型 + 排序 -->
    <div class="search-filters" v-if="hasSearched">
      <div class="filter-row">
        <button
          v-for="t in types"
          :key="t.key"
          class="filter-btn"
          :class="{ active: searchType === t.key }"
          @click="searchType = t.key; doSearch()"
        >
          {{ t.icon }} {{ t.label }}
        </button>
      </div>
      <div class="filter-row" v-if="searchType === 'feed'">
        <button
          v-for="s in sorts"
          :key="s.key"
          class="filter-btn small"
          :class="{ active: searchSort === s.key }"
          @click="searchSort = s.key; doSearch()"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>搜索中...</span>
      </div>

      <template v-else-if="hasSearched">
        <div v-if="results.length === 0" class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">没有找到相关内容</div>
        </div>

        <template v-else>
          <template v-for="item in results" :key="item.id || Math.random()">
            <!-- Feed -->
            <FeedCard v-if="item.entityType === 'feed'" :item="item" />
            <!-- 应用 -->
            <div v-else-if="item.entityType === 'apk'" class="result-card" @click="router.push('/')">
              <div class="result-avatar">📦</div>
              <div class="result-info">
                <div class="result-title">{{ item.title || item.shorttitle }}</div>
                <div class="result-desc">{{ item.apkTypeName || '应用' }} · {{ item.version || '' }}</div>
              </div>
            </div>
            <!-- 用户 -->
            <div v-else-if="item.entityType === 'user'" class="result-card" @click="router.push(`/user/${item.uid}`)">
              <div class="result-avatar">
                <img v-if="item.userAvatar" :src="item.userAvatar" @error="$event.target.style.display='none'">
                <span v-else>👤</span>
              </div>
              <div class="result-info">
                <div class="result-title">{{ item.username || item.title }}</div>
                <div class="result-desc">{{ item.description || '' }}</div>
              </div>
            </div>
            <!-- 话题/数码 -->
            <div v-else-if="item.entityType === 'topic'" class="result-card" @click="router.push(`/topic/${item.tag || item.title}`)">
              <div class="result-avatar">💬</div>
              <div class="result-info">
                <div class="result-title">{{ item.title || item.tag }}</div>
                <div class="result-desc">{{ item.description || '' }} {{ item.feedNum ? item.feedNum + ' 动态' : '' }}</div>
              </div>
            </div>
            <div v-else-if="item.entityType === 'product'" class="result-card" @click="router.push(`/product/${item.id}`)">
              <div class="result-avatar">
                <img v-if="item.logo" :src="fixImgUrl(item.logo)" @error="$event.target.style.display='none'">
                <span v-else>📱</span>
              </div>
              <div class="result-info">
                <div class="result-title">{{ item.title }}</div>
                <div class="result-meta">
                  <span v-if="item.star_average_score > 0" class="meta-item">⭐ {{ Number(item.star_average_score).toFixed(1) }}</span>
                  <span v-if="item.follow_num_txt" class="meta-item">👥 {{ item.follow_num_txt }}</span>
                  <span v-if="item.hot_num_txt" class="meta-item">🔥 {{ item.hot_num_txt }}</span>
                  <span v-if="item.vote_dig_percentage > 0" class="meta-item">👍 {{ item.vote_dig_percentage }}%</span>
                </div>
                <div class="result-desc">{{ item.description || '' }}</div>
              </div>
            </div>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-box input {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-box button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.search-box button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggest-box {
  position: absolute;
  top: 60px;
  left: 16px;
  right: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.suggest-item:hover {
  background: var(--bg-hover);
}

.suggest-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.history-header button {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 13px;
}

.search-filters {
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.filter-btn {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-btn.small {
  padding: 4px 10px;
  font-size: 12px;
}

.filter-btn.active {
  background: var(--accent);
  color: white;
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

.result-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-card:hover {
  border-color: var(--accent);
}

.result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  flex: 1;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
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
