<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatTime, formatNum, esc, fixImgUrl, decodeUser } from '@/utils/format'
import { renderEmoji } from '@/utils/emoji'
import FeedActions from './FeedActions.vue'
import Lightbox from '@/components/media/Lightbox.vue'

const props = defineProps({
  item: { type: Object, required: true }
})

const emit = defineEmits(['delete'])

const router = useRouter()

// Lightbox
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)
const lightboxImages = ref([])

function openLightbox(index) {
  lightboxImages.value = (props.item.picArr || []).map(pic => fixImgUrl(pic))
  lightboxIndex.value = index
  lightboxVisible.value = true
}

function openDetail() {
  router.push(`/feed/${props.item.id}`)
}

function openUser(e) {
  e.stopPropagation()
  if (props.item.uid) {
    router.push(`/user/${props.item.uid}`)
  }
}

const plainMessage = (props.item.message || '').replace(/<[^>]+>/g, '').trim()
</script>

<template>
  <div class="feed-card" @click="openDetail">
    <!-- 头部：头像 + 用户名 + 时间 -->
    <div class="feed-header">
      <div class="feed-avatar" @click="openUser($event)">
        <img v-if="item.userAvatar" :src="fixImgUrl(item.userAvatar)" @error="$event.target.style.display='none'">
        <span v-else>{{ (item.username || '?')[0] }}</span>
      </div>
      <div class="feed-user-info">
        <div class="feed-username" @click="openUser($event)">{{ decodeUser(item.username || '匿名') }}</div>
        <div class="feed-time">{{ formatTime(item.dateline) }}</div>
      </div>
      <div v-if="item.ttitle" class="feed-topic">{{ item.ttitle }}</div>
    </div>

    <!-- 内容 -->
    <div v-if="plainMessage" class="feed-message" v-html="renderEmoji(esc(plainMessage))"></div>

    <!-- 图片 -->
    <div v-if="item.entityTemplate === 'feedCover' && item.pic" class="feed-cover">
      <img :src="fixImgUrl(item.pic)" loading="lazy" @error="$event.target.style.display='none'">
    </div>
    <div v-else-if="item.picArr && item.picArr.length > 0" class="feed-images" :class="'cols-' + Math.min(item.picArr.length, 3)">
      <img
        v-for="(pic, i) in item.picArr"
        :key="i"
        :src="fixImgUrl(pic)"
        loading="lazy"
        @click.stop="openLightbox(i)"
        @error="$event.target.style.display='none'"
      >
    </div>

    <!-- Lightbox -->
    <Lightbox
      :images="lightboxImages"
      :index="lightboxIndex"
      :visible="lightboxVisible"
      @close="lightboxVisible = false"
    />

    <!-- 操作栏 -->
    <div @click.stop>
      <FeedActions :feed="item" compact @delete="emit('delete', $event)" />
    </div>
  </div>
</template>

<style scoped>
.feed-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.feed-card:hover {
  border-color: var(--accent);
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.feed-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.feed-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feed-avatar span {
  font-size: 16px;
  color: var(--text-secondary);
}

.feed-user-info {
  flex: 1;
  min-width: 0;
}

.feed-username {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.feed-username:hover {
  color: var(--accent);
}

.feed-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.feed-topic {
  font-size: 12px;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}

.feed-message {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 12px;
  word-break: break-word;
}

.feed-cover img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 12px;
}

.feed-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.feed-images.cols-1 { grid-template-columns: 1fr; max-width: 400px; }
.feed-images.cols-2 { grid-template-columns: repeat(2, 1fr); }
.feed-images.cols-3 { grid-template-columns: repeat(3, 1fr); }

.feed-images img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius);
  cursor: zoom-in;
  background: var(--bg-tertiary);
}

.feed-images.cols-1 img {
  aspect-ratio: 16/10;
}
</style>
