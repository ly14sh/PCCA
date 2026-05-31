<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedApi } from '@/composables/useApi'
import { formatNum, fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'

const route = useRoute()
const router = useRouter()
const { fetch: apiFetch } = useFeedApi()

const app = ref(null)
const feeds = ref([])
const loading = ref(true)
const activeTab = ref('info')

async function loadApp() {
  loading.value = true
  try {
    const id = route.params.id
    const res = await apiFetch(`/v6/apk/detail?id=${id}`)
    app.value = res.data || {}

    // 加载相关动态
    try {
      const feedRes = await apiFetch(`/v6/apk/feed/list?id=${id}&page=1`)
      feeds.value = feedRes.data || []
    } catch {}
  } catch (e) {
    console.error('Load app error:', e)
  } finally {
    loading.value = false
  }
}

function openDownload() {
  if (app.value?.apkUrl) {
    window.kuan.openExternal(app.value.apkUrl)
  }
}

onMounted(loadApp)
</script>

<template>
  <div class="app-detail-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else-if="app">
      <!-- 应用头部 -->
      <div class="app-header">
        <div class="app-icon">
          <img v-if="app.logo" :src="fixImgUrl(app.logo)" @error="$event.target.style.display='none'">
          <span v-else>📦</span>
        </div>
        <div class="app-info">
          <div class="app-name">{{ app.title || app.shorttitle }}</div>
          <div class="app-meta">
            <span v-if="app.apkTypeName" class="app-type">{{ app.apkTypeName }}</span>
            <span v-if="app.version" class="app-version">v{{ app.version }}</span>
            <span v-if="app.starScore" class="app-score">⭐ {{ app.starScore }}</span>
          </div>
          <div class="app-stats">
            <span v-if="app.downCount">📥 {{ formatNum(app.downCount) }}</span>
            <span v-if="app.fileSize">📦 {{ (app.fileSize / 1024 / 1024).toFixed(1) }}MB</span>
          </div>
        </div>
        <button class="download-btn" @click="openDownload">下载</button>
      </div>

      <!-- Tab 栏 -->
      <div class="app-tabs">
        <button :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">详情</button>
        <button :class="{ active: activeTab === 'feed' }" @click="activeTab = 'feed'">动态</button>
      </div>

      <!-- 详情 -->
      <div v-if="activeTab === 'info'" class="app-content">
        <!-- 截图 -->
        <div v-if="app.screenshots && app.screenshots.length > 0" class="app-screenshots">
          <div class="screenshot-scroll">
            <img
              v-for="(shot, i) in app.screenshots"
              :key="i"
              :src="fixImgUrl(shot)"
              @error="$event.target.style.display='none'"
            >
          </div>
        </div>

        <!-- 简介 -->
        <div v-if="app.description" class="app-desc">
          <h4>应用简介</h4>
          <p>{{ app.description }}</p>
        </div>

        <!-- 详细信息 -->
        <div class="app-detail-info">
          <div class="info-row">
            <span class="info-label">包名</span>
            <span class="info-value">{{ app.packageName || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">版本</span>
            <span class="info-value">{{ app.version || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">大小</span>
            <span class="info-value">{{ app.fileSize ? (app.fileSize / 1024 / 1024).toFixed(1) + 'MB' : '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">更新时间</span>
            <span class="info-value">{{ app.lastUpdate || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">开发者</span>
            <span class="info-value">{{ app.developer || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 相关动态 -->
      <div v-if="activeTab === 'feed'" class="app-feeds">
        <template v-for="item in feeds" :key="item.id">
          <FeedCard v-if="item.entityType === 'feed'" :item="item" />
        </template>
        <div v-if="feeds.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无相关动态</div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">应用不存在</div>
    </div>
  </div>
</template>

<style scoped>
.app-detail-page {
  height: 100%;
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

.app-header {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-icon {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-icon span {
  font-size: 32px;
}

.app-info {
  flex: 1;
}

.app-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.app-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.app-type,
.app-version,
.app-score {
  font-size: 12px;
  color: var(--text-muted);
}

.app-type {
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 4px;
}

.app-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.download-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.download-btn:hover {
  opacity: 0.9;
}

.app-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.app-tabs button {
  padding: 10px 20px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.app-tabs button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.app-screenshots {
  margin-bottom: 16px;
}

.screenshot-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.screenshot-scroll::-webkit-scrollbar {
  height: 0;
}

.screenshot-scroll img {
  height: 240px;
  border-radius: var(--radius);
  flex-shrink: 0;
}

.app-desc {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.app-desc h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.app-desc p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.app-detail-info {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--border);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: var(--text-muted);
}

.info-value {
  font-size: 13px;
  color: var(--text-primary);
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
