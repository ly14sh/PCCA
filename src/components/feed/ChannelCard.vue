<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { fixImgUrl } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true }
})

const router = useRouter()
const activeSubTab = ref(0)

// 快捷入口图标映射
const quickIcons = {
  '值得看': '🔥', '热闻': '📰', '众测': '🧪', '买过': '🛒', '官方频道': '📢',
  '玩机大神': '🔧', '投票': '📊', '头条榜': '🏆', '新动态': '🆕', '推荐官': '🌟',
  '数码': '📱', '游戏': '🎮', '应用': '📦', '汽车': '🚗', '酷图': '📷',
  '视频': '🎬', '问答': '❓', '交易': '💰', '签到': '✅', '排行榜': '🏅'
}

function openEntity(entity) {
  if (!entity.url) return
  console.log('ChannelCard openEntity:', entity.url, entity)
  const url = entity.url
  
  // 话题 /t/tag
  if (url.startsWith('/t/')) {
    const tag = decodeURIComponent(url.replace('/t/', ''))
    router.push(`/topic/${tag}`)
  } 
  // 产品 /product/id
  else if (url.startsWith('/product/')) {
    router.push(url)
  } 
  // 页面 /page?url=xxx
  else if (url.startsWith('/page?url=')) {
    const pageName = url.replace('/page?url=', '')
    router.push(`/page?url=${encodeURIComponent(pageName)}&title=${encodeURIComponent(entity.title || '')}`)
  }
  // #/page/dataList?url=xxx 或 #/feed/digestList?... 等 hash 路由
  else if (url.startsWith('#/')) {
    const hashPath = url.replace('#', '')
    // 如果是 dataList，用 PageChannel 加载
    if (hashPath.includes('/page/dataList')) {
      const pageUrl = hashPath.split('url=')[1]?.split('&')[0]
      if (pageUrl) {
        router.push(`/page?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(entity.title || '')}`)
      }
    }
    // 如果是话题列表 tagList/tagFeedList
    else if (hashPath.includes('/topic/tagList') || hashPath.includes('/topic/tagFeedList')) {
      // 作为页面加载，让 PageChannel 处理
      router.push(`/page?url=${encodeURIComponent(hashPath)}&title=${encodeURIComponent(entity.title || '')}`)
    }
    // 单个话题 /topic/tag
    else if (hashPath.includes('/topic/')) {
      const tag = new URLSearchParams(hashPath.split('?')[1]).get('tag')
      if (tag) router.push(`/topic/${tag}`)
    }
    // 其他 hash 路由，尝试作为页面加载
    else {
      router.push(`/page?url=${encodeURIComponent(hashPath)}&title=${encodeURIComponent(entity.title || '')}`)
    }
  }
  // 相对路径（如 V11_VERTICAL_TOPIC?type=xxx）
  else if (!url.startsWith('http') && !url.startsWith('/')) {
    router.push(`/page?url=${encodeURIComponent(url)}&title=${encodeURIComponent(entity.title || '')}`)
  }
  // 其他绝对路径
  else if (url.startsWith('/')) {
    router.push(url)
  }
}

function switchSubTab(idx, entity) {
  activeSubTab.value = idx
  if (entity.url) {
    openEntity(entity)
  }
}

function getIcon(entity) {
  const title = (entity.title || '').trim()
  return quickIcons[title] || '📌'
}
</script>

<template>
  <div class="channel-section">
    <div v-if="item.title" class="section-title">{{ item.title }}</div>

    <!-- iconLinkGridCard: 快捷入口 -->
    <div v-if="item.entityTemplate === 'iconLinkGridCard'" class="channel-grid">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-card mini"
        @click="openEntity(entity)"
      >
        <div class="channel-icon-wrapper">
          <img v-if="entity.logo" :src="fixImgUrl(entity.logo)" class="channel-logo" @error="$event.target.outerHTML='<div class=\'channel-icon\'>${getIcon(entity)}</div>'">
          <div v-else class="channel-icon">{{ getIcon(entity) }}</div>
        </div>
        <div class="channel-title">{{ entity.title }}</div>
      </div>
    </div>

    <!-- iconMiniScrollCard: 横向滚动标签 -->
    <div v-else-if="item.entityTemplate === 'iconMiniScrollCard'" class="channel-scroll">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-pill"
        @click="openEntity(entity)"
      >
        {{ entity.title }}
      </div>
    </div>

    <!-- imageTextScrollCard: 图文横滑 -->
    <div v-else-if="item.entityTemplate === 'imageTextScrollCard'" class="channel-scroll">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-img-card"
        @click="openEntity(entity)"
      >
        <img v-if="entity.pic" :src="fixImgUrl(entity.pic)" @error="$event.target.style.display='none'">
        <span>{{ entity.title }}</span>
      </div>
    </div>

    <!-- imageCarouselCard_1: Banner 轮播 -->
    <div v-else-if="item.entityTemplate === 'imageCarouselCard_1'" class="channel-carousel">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title || Math.random()"
        class="carousel-item"
        @click="openEntity(entity)"
      >
        <img v-if="entity.pic" :src="fixImgUrl(entity.pic)" @error="$event.target.style.display='none'">
      </div>
    </div>

    <!-- iconButtonGridCard: 按钮网格 -->
    <div v-else-if="item.entityTemplate === 'iconButtonGridCard'" class="channel-grid">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-btn"
        @click="openEntity(entity)"
      >
        {{ entity.title }}
      </div>
    </div>

    <!-- selectorLinkCard: 筛选标签 -->
    <div v-else-if="item.entityTemplate === 'selectorLinkCard'" class="channel-scroll">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-tag"
        @click="openEntity(entity)"
      >
        {{ entity.title }}
      </div>
    </div>

    <!-- iconTabLinkGridCard: Tab选择器（周榜/月榜等） -->
    <div v-else-if="item.entityTemplate === 'iconTabLinkGridCard'" class="channel-tab-bar">
      <div
        v-for="(entity, idx) in (item.entities || [])"
        :key="entity.title"
        class="channel-tab-item"
        :class="{ active: idx === activeSubTab }"
        @click="switchSubTab(idx, entity)"
      >
        {{ entity.title }}
      </div>
    </div>

    <!-- imageTextGridCard: 图文网格（众测等） -->
    <div v-else-if="item.entityTemplate === 'imageTextGridCard'" class="channel-grid">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-img-card"
        @click="openEntity(entity)"
      >
        <img v-if="entity.pic" :src="fixImgUrl(entity.pic)" @error="$event.target.style.display='none'">
        <span>{{ entity.title }}</span>
      </div>
    </div>

    <!-- iconButtonGridCard: 按钮横幅 -->
    <div v-else-if="item.entityTemplate === 'iconButtonGridCard'" class="channel-scroll">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title"
        class="channel-banner-btn"
        @click="openEntity(entity)"
      >
        <img v-if="entity.pic" :src="fixImgUrl(entity.pic)" @error="$event.target.style.display='none'">
      </div>
    </div>

    <!-- 通用 fallback -->
    <div v-else class="channel-scroll">
      <div
        v-for="entity in (item.entities || [])"
        :key="entity.title || Math.random()"
        class="channel-pill"
        @click="openEntity(entity)"
      >
        {{ entity.title }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.channel-section {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

/* 网格布局 - 原版 PCCA 风格 */
.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.channel-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.channel-card.mini {
  padding: 8px 6px;
}

.channel-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  margin-bottom: 6px;
  object-fit: cover;
}

.channel-icon {
  font-size: 28px;
  margin-bottom: 4px;
}

.channel-title {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 6px;
}

/* 横向滚动 */
.channel-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.channel-scroll::-webkit-scrollbar {
  height: 0;
}

.channel-pill {
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.channel-pill:hover {
  background: var(--accent);
  color: white;
}

.pill-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
}

/* 图文横滑 */
.channel-img-card {
  flex-shrink: 0;
  width: 120px;
  cursor: pointer;
  text-align: center;
}

.channel-img-card img {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 4px;
}

.channel-img-card span {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 轮播 */
.channel-carousel {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
}

.channel-carousel::-webkit-scrollbar {
  height: 0;
}

.carousel-item {
  flex-shrink: 0;
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
}

.carousel-item img {
  width: 300px;
  height: 140px;
  object-fit: cover;
  border-radius: var(--radius-lg);
}

/* 按钮网格 */
.channel-btn {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-btn:hover {
  background: var(--accent);
  color: white;
}

/* 筛选标签 */
.channel-tag {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.channel-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Tab选择器 */
.channel-tab-bar {
  display: flex;
  gap: 0;
  padding: 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.channel-tab-item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.channel-tab-item:hover {
  color: var(--accent);
}

.channel-tab-item.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

/* 按钮横幅 */
.channel-banner-btn {
  flex-shrink: 0;
  cursor: pointer;
  border-radius: var(--radius);
  overflow: hidden;
}

.channel-banner-btn img {
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius);
}
</style>
