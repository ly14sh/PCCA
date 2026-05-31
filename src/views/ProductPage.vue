<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductApi } from '@/composables/useApi'
import { formatNum, fixImgUrl } from '@/utils/format'
import FeedCard from '@/components/feed/FeedCard.vue'

const route = useRoute()
const router = useRouter()
const { getProductDetail, getProductFeedList } = useProductApi()

const product = ref(null)
const feeds = ref([])
const loading = ref(true)

async function loadProduct() {
  loading.value = true
  const id = route.params.id
  try {
    const [detailRes, feedRes] = await Promise.all([
      getProductDetail(id),
      getProductFeedList(id, 1),
    ])
    product.value = detailRes.data || {}
    feeds.value = feedRes.data || []
  } catch (e) {
    console.error('Load product error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)
watch(() => route.params.id, loadProduct)
</script>

<template>
  <div class="product-page">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else-if="product">
      <!-- 产品头部 -->
      <div class="product-header">
        <div v-if="product.logo" class="product-logo">
          <img :src="fixImgUrl(product.logo)" @error="$event.target.style.display='none'">
        </div>
        <div class="product-info">
          <h2>{{ product.title || '数码产品' }}</h2>
          <div class="product-meta">
            <span v-if="product.star_average_score > 0">⭐ {{ Number(product.star_average_score).toFixed(1) }}</span>
            <span v-if="product.follow_num_txt">{{ product.follow_num_txt }} 关注</span>
            <span v-if="product.price_min">¥{{ product.price_min }}<template v-if="product.price_max"> - ¥{{ product.price_max }}</template></span>
          </div>
          <p v-if="product.description" class="product-desc">{{ product.description }}</p>
        </div>
      </div>

      <!-- 动态列表 -->
      <div class="product-feeds">
        <h3 class="section-title">相关动态</h3>
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
.product-page {
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

.product-header {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
}

.product-logo img {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}

.product-info h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.product-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.product-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
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
