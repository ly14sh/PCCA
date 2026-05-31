<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFeedApi } from '@/composables/useApi'
import { fixImgUrl } from '@/utils/format'

const router = useRouter()
const { getFeed } = useFeedApi()

const channels = ref([])
const loading = ref(true)

async function loadChannels() {
  loading.value = true
  try {
    const res = await getFeed(1)
    const items = []
    ;(res.data || []).forEach(item => {
      if (item.entityType === 'card' && item.entities) {
        item.entities.forEach(e => {
          if (e.url) items.push(e)
        })
      }
    })
    channels.value = items
  } catch (e) {
    console.error('Load channels error:', e)
  } finally {
    loading.value = false
  }
}

function openChannel(item) {
  if (item.url && item.url.startsWith('/t/')) {
    const tag = decodeURIComponent(item.url.replace('/t/', ''))
    router.push(`/topic/${tag}`)
  }
}

onMounted(loadChannels)
</script>

<template>
  <div class="channels-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div v-if="channels.length === 0" class="empty-state">
        <div class="empty-icon">📡</div>
        <div class="empty-text">暂无频道</div>
      </div>

      <div class="channel-grid">
        <div
          v-for="ch in channels"
          :key="ch.title"
          class="channel-card"
          @click="openChannel(ch)"
        >
          <div class="channel-icon">
            <img v-if="ch.logo" :src="fixImgUrl(ch.logo)" @error="$event.target.style.display='none'">
            <span v-else>📡</span>
          </div>
          <div class="channel-title">{{ ch.title }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.channels-page {
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

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.channel-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.channel-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.channel-icon img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
}

.channel-title {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
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
