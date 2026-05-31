<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedApi, useReplyApi } from '@/composables/useApi'
import { formatTime, formatNum, esc, fixImgUrl, decodeUser } from '@/utils/format'
import { renderEmoji } from '@/utils/emoji'
import Lightbox from '@/components/media/Lightbox.vue'

const route = useRoute()
const router = useRouter()
const { getFeedDetail, likeFeed, unlikeFeed } = useFeedApi()
const { getReplyListSorted, likeReply, unlikeReply, postReply } = useReplyApi()

const feed = ref(null)
const replies = ref([])
const loading = ref(true)
const replySort = ref('lastupdate_desc')
const replyPage = ref(1)
const replyInput = ref('')
const submitting = ref(false)
const replyingTo = ref(null)
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)
const lightboxImages = ref([])

async function loadDetail() {
  loading.value = true
  try {
    const id = route.params.id
    const [feedRes, replyRes] = await Promise.all([
      getFeedDetail(id),
      getReplyListSorted(id, 1, replySort.value),
    ])
    feed.value = feedRes.data || {}
    replies.value = (replyRes.data || []).map(r => ({
      ...r,
      subReplies: r.subRows || [],
      showSubReplies: false,
    }))
  } catch (e) {
    console.error('Load detail error:', e)
  } finally {
    loading.value = false
  }
}

async function changeSort(sort) {
  replySort.value = sort
  replyPage.value = 1
  try {
    const res = await getReplyListSorted(route.params.id, 1, sort)
    replies.value = (res.data || []).map(r => ({
      ...r,
      subReplies: r.subRows || [],
      showSubReplies: false,
    }))
  } catch {}
}

async function handleLike() {
  if (!feed.value) return
  try {
    const isLiked = feed.value.userAction?.like
    if (isLiked) {
      await unlikeFeed(feed.value.id)
      feed.value.userAction.like = false
      feed.value.likenum = (feed.value.likenum || 1) - 1
    } else {
      await likeFeed(feed.value.id)
      feed.value.userAction = { ...feed.value.userAction, like: true }
      feed.value.likenum = (feed.value.likenum || 0) + 1
    }
  } catch {}
}

async function handleReplyLike(reply) {
  try {
    const isLiked = reply.userAction?.like
    if (isLiked) {
      await unlikeReply(reply.id)
      reply.userAction.like = false
      reply.likenum = (reply.likenum || 1) - 1
    } else {
      await likeReply(reply.id)
      reply.userAction = { ...reply.userAction, like: true }
      reply.likenum = (reply.likenum || 0) + 1
    }
  } catch {}
}

function setReplyTarget(reply) {
  replyingTo.value = reply
  replyInput.value = ''
  nextTick(() => {
    document.querySelector('.reply-input-bar input')?.focus()
  })
}

function cancelReply() {
  replyingTo.value = null
}

async function submitReply() {
  if (!replyInput.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const message = replyingTo.value
      ? `回复 @${replyingTo.value.username}：${replyInput.value.trim()}`
      : replyInput.value.trim()
    await postReply(route.params.id, message)
    replyInput.value = ''
    replyingTo.value = null
    const res = await getReplyListSorted(route.params.id, 1, replySort.value)
    replies.value = (res.data || []).map(r => ({
      ...r,
      subReplies: r.subRows || [],
      showSubReplies: false,
    }))
  } catch (e) {
    console.error('Reply error:', e)
  } finally {
    submitting.value = false
  }
}

function openLightbox(index) {
  lightboxImages.value = (feed.value.picArr || []).map(pic => fixImgUrl(pic))
  lightboxIndex.value = index
  lightboxVisible.value = true
}

function closeLightbox() {
  lightboxVisible.value = false
}

function openUser(uid) {
  if (uid) router.push(`/user/${uid}`)
}

onMounted(loadDetail)
</script>

<template>
  <div class="detail-page">
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <span class="page-title">动态详情</span>
    </div>
    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else-if="feed">
      <!-- 动态内容 -->
      <div class="feed-detail">
        <div class="detail-header">
          <div class="detail-avatar" @click="openUser(feed.uid)">
            <img v-if="feed.userAvatar" :src="fixImgUrl(feed.userAvatar)" @error="$event.target.style.display='none'">
            <span v-else>{{ (feed.username || '?')[0] }}</span>
          </div>
          <div class="detail-user-info">
            <div class="detail-username" @click="openUser(feed.uid)">{{ decodeUser(feed.username || '匿名') }}</div>
            <div class="detail-time">{{ formatTime(feed.dateline) }}</div>
          </div>
          <div v-if="feed.ttitle" class="detail-topic" @click="router.push(`/topic/${feed.tid}`)">{{ feed.ttitle }}</div>
        </div>

        <div v-if="feed.title" class="detail-title">{{ feed.title }}</div>
        <div class="detail-message" v-html="renderEmoji(esc((feed.message || '').replace(/<[^>]+>/g, '')))"></div>

        <!-- 图片 -->
        <div v-if="feed.picArr && feed.picArr.length > 0" class="detail-images">
          <img
            v-for="(pic, i) in feed.picArr"
            :key="i"
            :src="fixImgUrl(pic)"
            loading="lazy"
            @click="openLightbox(i)"
            @error="$event.target.style.display='none'"
          >
        </div>

        <!-- 操作栏 -->
        <div class="detail-actions">
          <button class="action-btn" :class="{ liked: feed.userAction?.like }" @click="handleLike">
            {{ feed.userAction?.like ? '❤️' : '🤍' }} {{ formatNum(feed.likenum || 0) }}
          </button>
          <span class="action-btn">💬 {{ formatNum(feed.replynum || 0) }}</span>
        </div>
      </div>

      <!-- 评论排序 -->
      <div class="reply-sort">
        <span class="sort-label">评论</span>
        <button :class="{ active: replySort === 'lastupdate_desc' }" @click="changeSort('lastupdate_desc')">最新</button>
        <button :class="{ active: replySort === 'dateline_desc' }" @click="changeSort('dateline_desc')">最早</button>
        <button :class="{ active: replySort === 'popular' }" @click="changeSort('popular')">最热</button>
      </div>

      <!-- 评论列表 -->
      <div class="reply-list">
        <div v-if="replies.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无评论</div>
        </div>

        <div v-for="r in replies" :key="r.id" class="reply-item">
          <div class="reply-avatar" @click="openUser(r.uid)">
            <img v-if="r.userAvatar" :src="fixImgUrl(r.userAvatar)" @error="$event.target.style.display='none'">
            <span v-else>{{ (r.username || '?')[0] }}</span>
          </div>
          <div class="reply-content">
            <div class="reply-header">
              <span class="reply-user" @click="openUser(r.uid)">{{ decodeUser(r.username) }}</span>
              <span class="reply-time">{{ formatTime(r.dateline) }}</span>
            </div>
            <div class="reply-text" v-html="renderEmoji(esc((r.message || '').replace(/<[^>]+>/g, '')))"></div>
            <div class="reply-actions">
              <button class="reply-action" :class="{ liked: r.userAction?.like }" @click="handleReplyLike(r)">
                {{ r.userAction?.like ? '❤️' : '🤍' }} {{ formatNum(r.likenum || 0) }}
              </button>
              <button class="reply-action" @click="setReplyTarget(r)">回复</button>
            </div>

            <!-- 子回复 -->
            <div v-if="r.subReplies && r.subReplies.length > 0" class="sub-replies">
              <button
                v-if="!r.showSubReplies"
                class="show-sub-btn"
                @click="r.showSubReplies = true"
              >
                查看 {{ r.subReplies.length }} 条回复
              </button>
              <div v-if="r.showSubReplies" class="sub-reply-list">
                <div v-for="sub in r.subReplies" :key="sub.id" class="sub-reply-item">
                  <span class="sub-reply-user" @click="openUser(sub.uid)">{{ decodeUser(sub.username) }}</span>
                  <span class="sub-reply-text" v-html="renderEmoji(esc((sub.message || '').replace(/<[^>]+>/g, '')))"></span>
                  <span class="sub-reply-time">{{ formatTime(sub.dateline) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 评论输入 -->
      <div class="reply-input-bar">
        <div v-if="replyingTo" class="reply-target">
          回复 @{{ replyingTo.username }}
          <button @click="cancelReply">✕</button>
        </div>
        <div class="input-row">
          <input
            v-model="replyInput"
            :placeholder="replyingTo ? `回复 @${replyingTo.username}...` : '写评论...'"
            @keydown.enter="submitReply"
          >
          <button @click="submitReply" :disabled="!replyInput.trim() || submitting">
            {{ submitting ? '...' : '发送' }}
          </button>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">动态不存在</div>
    </div>

    <!-- Lightbox -->
    <Lightbox
      :images="lightboxImages"
      :index="lightboxIndex"
      :visible="lightboxVisible"
      @close="lightboxVisible = false"
    />
  </div>
</template>

<style scoped>
.detail-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
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

.feed-detail {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.detail-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-avatar span {
  font-size: 18px;
  color: var(--text-secondary);
}

.detail-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.detail-username:hover {
  color: var(--accent);
}

.detail-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.detail-topic {
  margin-left: auto;
  font-size: 12px;
  color: var(--accent);
  background: var(--bg-tertiary);
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.detail-topic:hover {
  background: var(--accent);
  color: white;
}

.detail-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.detail-message {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 16px;
  word-break: break-word;
}

.detail-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.detail-images img {
  width: 100%;
  border-radius: var(--radius);
  cursor: zoom-in;
  transition: transform 0.2s ease;
}

.detail-images img:hover {
  transform: scale(1.02);
}

.detail-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
}

.action-btn.liked {
  color: var(--red);
}

/* 评论排序 */
.reply-sort {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.sort-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.reply-sort button {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reply-sort button.active {
  background: var(--accent);
  color: white;
}

/* 评论列表 */
.reply-list {
  margin-bottom: 16px;
}

.reply-item {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.reply-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reply-avatar span {
  font-size: 14px;
  color: var(--text-secondary);
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.reply-user {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.reply-user:hover {
  color: var(--accent);
}

.reply-time {
  font-size: 12px;
  color: var(--text-muted);
}

.reply-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.reply-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.reply-action {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.reply-action:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.reply-action.liked {
  color: var(--red);
}

/* 子回复 */
.sub-replies {
  margin-top: 10px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
}

.show-sub-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.show-sub-btn:hover {
  text-decoration: underline;
}

.sub-reply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-reply-item {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
}

.sub-reply-user {
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  margin-right: 6px;
}

.sub-reply-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 8px;
}

/* 评论输入 */
.reply-input-bar {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width);
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  padding: 10px 16px;
}

.reply-target {
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-target button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 8px 14px;
  border-radius: var(--radius);
  font-size: 14px;
  outline: none;
}

.input-row input:focus {
  border-color: var(--accent);
}

.input-row button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
