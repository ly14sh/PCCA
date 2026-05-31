<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFeedApi } from '@/composables/useApi'
import { renderEmoji } from '@/utils/emoji'
import { fixImgUrl } from '@/utils/format'

const router = useRouter()
const { createFeed } = useFeedApi()

const content = ref('')
const images = ref([])
const selectedTopic = ref(null)
const showEmoji = ref(false)
const showTopic = ref(false)
const topicSearch = ref('')
const submitting = ref(false)
const preview = ref(false)

// 酷安表情列表（常用）
const emojiList = [
  '[滑稽]', '[哈哈]', '[吃瓜]', '[doge]', '[捂脸]', '[笑哭]',
  '[阴险]', '[酷]', '[喷]', '[怒]', '[委屈]', '[惊讶]',
  '[汗]', '[呵呵]', '[黑线]', '[吐]', '[抠鼻]', '[鄙视]',
  '[可爱]', '[害羞]', '[闭嘴]', '[钱]', '[哭]', '[鼓掌]',
  '[ok]', '[胜利]', '[弱]', '[爱心]', '[心碎]', '[玫瑰]',
]

function insertEmoji(emoji) {
  content.value += emoji
  showEmoji.value = false
}

function handleImageUpload(e) {
  const files = Array.from(e.target.files || [])
  files.forEach(f => {
    const reader = new FileReader()
    reader.onload = () => {
      images.value.push({ file: f, preview: reader.result })
    }
    reader.readAsDataURL(f)
  })
}

function removeImage(index) {
  images.value.splice(index, 1)
}

async function handleSubmit() {
  if (!content.value.trim() && images.value.length === 0) return
  if (submitting.value) return

  submitting.value = true
  try {
    const data = {
      message: content.value.trim(),
      pic: images.value.map(i => i.file),
      topicId: selectedTopic.value?.id || '',
    }
    await createFeed(data)
    router.back()
  } catch (e) {
    console.error('Create feed error:', e)
  } finally {
    submitting.value = false
  }
}

const canSubmit = computed(() =>
  (content.value.trim() || images.value.length > 0) && !submitting.value
)
</script>

<template>
  <div class="create-page">
    <!-- 顶部栏 -->
    <div class="create-header">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <h3>发动态</h3>
      <button class="submit-btn" :class="{ active: canSubmit }" @click="handleSubmit" :disabled="!canSubmit">
        {{ submitting ? '发布中...' : '发布' }}
      </button>
    </div>

    <!-- 内容区 -->
    <div class="create-body">
      <!-- 文本输入 -->
      <textarea
        v-model="content"
        placeholder="分享你的想法..."
        rows="8"
        @keydown.ctrl.enter="handleSubmit"
      ></textarea>

      <!-- 图片预览 -->
      <div v-if="images.length > 0" class="image-grid">
        <div v-for="(img, i) in images" :key="i" class="image-item">
          <img :src="img.preview">
          <button class="remove-btn" @click="removeImage(i)">✕</button>
        </div>
      </div>

      <!-- 话题选择 -->
      <div v-if="selectedTopic" class="topic-tag">
        #{{ selectedTopic.title }}
        <button @click="selectedTopic = null">✕</button>
      </div>

      <!-- 预览 -->
      <div v-if="preview && content" class="preview-box">
        <div class="preview-label">预览</div>
        <div class="preview-content" v-html="renderEmoji(content)"></div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="create-toolbar">
      <button class="tool-btn" @click="showEmoji = !showEmoji">😊 表情</button>
      <label class="tool-btn">
        🖼️ 图片
        <input type="file" accept="image/*" multiple @change="handleImageUpload" style="display:none">
      </label>
      <button class="tool-btn" @click="showTopic = !showTopic"># 话题</button>
      <button class="tool-btn" @click="preview = !preview">👁️ 预览</button>
    </div>

    <!-- 表情面板 -->
    <div v-if="showEmoji" class="emoji-panel">
      <div class="emoji-grid">
        <button
          v-for="emoji in emojiList"
          :key="emoji"
          class="emoji-item"
          @click="insertEmoji(emoji)"
          v-html="renderEmoji(emoji)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.create-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.back-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.submit-btn {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: not-allowed;
}

.submit-btn.active {
  background: var(--accent);
  color: white;
  cursor: pointer;
}

.create-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.7;
  resize: none;
  outline: none;
}

textarea::placeholder {
  color: var(--text-muted);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topic-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  margin-top: 12px;
}

.topic-tag button {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.preview-box {
  margin-top: 16px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
}

.preview-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.preview-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.create-toolbar {
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.tool-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.emoji-panel {
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  max-height: 200px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
}

.emoji-item {
  background: none;
  border: none;
  padding: 6px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s ease;
}

.emoji-item:hover {
  background: var(--bg-hover);
}
</style>
