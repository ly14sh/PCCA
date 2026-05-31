<script setup>
import { ref, computed } from 'vue'
import { useFeedApi } from '@/composables/useApi'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  feed: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'delete'])

const userStore = useUserStore()
const { likeFeed, unlikeFeed, favoriteFeed, reportFeed, deleteFeed } = useFeedApi()

const showMenu = ref(false)
const showReport = ref(false)
const reportReason = ref('')
const isMine = computed(() => String(props.feed.uid) === String(userStore.uid))

const reportReasons = [
  '垃圾广告', '色情低俗', '政治敏感', '人身攻击',
  '虚假信息', '抄袭侵权', '其他',
]

async function handleLike() {
  try {
    const isLiked = props.feed.userAction?.like
    if (isLiked) {
      await unlikeFeed(props.feed.id)
      props.feed.userAction.like = false
      props.feed.likenum = (props.feed.likenum || 1) - 1
    } else {
      await likeFeed(props.feed.id)
      props.feed.userAction = { ...props.feed.userAction, like: true }
      props.feed.likenum = (props.feed.likenum || 0) + 1
    }
    emit('update')
  } catch {}
}

async function handleFavorite() {
  try {
    const isFaved = props.feed.userAction?.favorite
    await favoriteFeed(props.feed.id)
    props.feed.userAction = { ...props.feed.userAction, favorite: !isFaved }
    showMenu.value = false
    emit('update')
  } catch {}
}

async function handleReport() {
  if (!reportReason.value) return
  try {
    await reportFeed(props.feed.id, reportReason.value)
    showReport.value = false
    showMenu.value = false
    reportReason.value = ''
    alert('举报已提交')
  } catch {}
}

async function handleDelete() {
  if (!confirm('确定删除这条动态？')) return
  try {
    await deleteFeed(props.feed.id)
    showMenu.value = false
    emit('delete', props.feed.id)
  } catch {}
}

function handleShare() {
  const url = `https://www.coolapk.com/feed/${props.feed.id}`
  navigator.clipboard.writeText(url).then(() => {
    alert('链接已复制')
  }).catch(() => {
    window.kuan.openExternal(url)
  })
  showMenu.value = false
}
</script>

<template>
  <div class="feed-actions" :class="{ compact }">
    <!-- 点赞 -->
    <button class="action-btn" :class="{ liked: feed.userAction?.like }" @click.stop="handleLike">
      {{ feed.userAction?.like ? '❤️' : '🤍' }}
      <span v-if="!compact">{{ feed.likenum || 0 }}</span>
    </button>

    <!-- 评论 -->
    <button class="action-btn" v-if="!compact">
      💬 <span>{{ feed.replynum || 0 }}</span>
    </button>

    <!-- 更多菜单 -->
    <div class="action-menu-wrapper">
      <button class="action-btn menu-trigger" @click.stop="showMenu = !showMenu">
        ⋯
      </button>

      <div v-if="showMenu" class="action-menu" @click.stop>
        <button class="menu-item" @click="handleFavorite">
          {{ feed.userAction?.favorite ? '⭐ 取消收藏' : '⭐ 收藏' }}
        </button>
        <button class="menu-item" @click="handleShare">
          🔗 复制链接
        </button>
        <button class="menu-item" @click="showReport = true" v-if="!isMine">
          🚨 举报
        </button>
        <button class="menu-item danger" @click="handleDelete" v-if="isMine">
          🗑️ 删除
        </button>
      </div>
    </div>

    <!-- 举报弹窗 -->
    <div v-if="showReport" class="report-modal" @click.self="showReport = false">
      <div class="report-content">
        <h4>举报原因</h4>
        <div class="report-options">
          <label v-for="reason in reportReasons" :key="reason" class="report-option">
            <input type="radio" v-model="reportReason" :value="reason">
            {{ reason }}
          </label>
        </div>
        <div class="report-actions">
          <button class="btn-cancel" @click="showReport = false">取消</button>
          <button class="btn-submit" @click="handleReport" :disabled="!reportReason">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.feed-actions.compact {
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.action-btn.liked {
  color: var(--red);
}

.menu-trigger {
  margin-left: auto;
}

/* 菜单 */
.action-menu-wrapper {
  position: relative;
  margin-left: auto;
}

.action-menu {
  position: absolute;
  right: 0;
  bottom: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  min-width: 140px;
  z-index: 100;
  padding: 4px;
  margin-bottom: 4px;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: var(--radius);
  transition: background 0.15s ease;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item.danger {
  color: var(--red);
}

/* 举报弹窗 */
.report-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.report-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 300px;
  border: 1px solid var(--border);
}

.report-content h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.report-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.report-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

.report-option input {
  accent-color: var(--accent);
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
}

.btn-submit {
  background: var(--red);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
