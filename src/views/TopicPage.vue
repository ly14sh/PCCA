<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTopicApi } from '@/composables/useApi'
import { formatNum, fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'

const route = useRoute()
const router = useRouter()
const { getTopicDetail, getTopicFeedList } = useTopicApi()

const topic = ref(null)
const feeds = ref([])
const loading = ref(true)
const sort = ref('lastupdate_desc')

async function loadTopic() {
  loading.value = true
  const tag = route.params.tag
  try {
    const [detailRes, feedRes] = await Promise.all([
      getTopicDetail(tag),
      getTopicFeedList(tag, 1, sort.value),
    ])
    topic.value = detailRes.data || {}
    feeds.value = feedRes.data || []
  } catch (e) {
    console.error('Load topic error:', e)
  } finally {
    loading.value = false
  }
}

async function changeSort(s) {
  sort.value = s
  try {
    const res = await getTopicFeedList(route.params.tag, 1, s)
    feeds.value = res.data || []
  } catch {}
}

onMounted(loadTopic)
watch(() => route.params.tag, loadTopic)
</script>

<template>
  <div class="topic-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else-if="topic">
      <!-- 话题头部 -->
      <div class="topic-header">
        <div v-if="topic.logo" class="topic-logo">
          <img :src="fixImgUrl(topic.logo)" @error="$event.target.style.display='none'">
        </div>
        <div class="topic-info">
          <h2>{{ topic.title || route.params.tag }}</h2>
          <p v-if="topic.description" class="topic-desc">{{ topic.description }}</p>
          <div class="topic-stats">
            <span>📌 {{ topic.feedNum || 0 }} 动态</span>
            <span>👀 {{ topic.viewNum || 0 }} 浏览</span>
            <span>❤️ {{ topic.followNum || 0 }} 关注</span>
          </div>
        </div>
      </div>

      <!-- 排序 -->
      <div class="topic-sort">
        <button :class="{ active: sort === 'lastupdate_desc' }" @click="changeSort('lastupdate_desc')">最近回复</button>
        <button :class="{ active: sort === 'dateline_desc' }" @click="changeSort('dateline_desc')">最近发布</button>
        <button :class="{ active: sort === 'popular' }" @click="changeSort('popular')">热门</button>
      </div>

      <!-- 动态列表 -->
      <div class="topic-feeds">
        <template v-for="item in feeds" :key="item.id">
          <FeedCard v-if="item.entityType === 'feed'" :item="item" />
        </template>
        <div v-if="feeds.length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无动态</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.topic-page {
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

.topic-header {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
}

.topic-logo img {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.topic-info h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.topic-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.topic-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.topic-sort {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.topic-sort button {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
}

.topic-sort button.active {
  background: var(--accent);
  color: white;
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
