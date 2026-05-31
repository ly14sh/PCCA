<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'update:index'])

const currentIndex = ref(props.index)
const scale = ref(1)
const rotate = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)

const currentSrc = computed(() => props.images[currentIndex.value] || '')
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.images.length - 1)
const showNav = computed(() => props.images.length > 1)

function resetTransform() { scale.value = 1; rotate.value = 0; offsetX.value = 0; offsetY.value = 0 }

function goPrev() {
  if (hasPrev.value) {
    currentIndex.value--
    resetTransform()
  }
}

function goNext() {
  if (hasNext.value) {
    currentIndex.value++
    resetTransform()
  }
}

function zoomIn() { scale.value = Math.min(scale.value + 0.25, 5) }
function zoomOut() { scale.value = Math.max(scale.value - 0.25, 0.25) }
function rotateLeft() { rotate.value -= 90 }
function rotateRight() { rotate.value += 90 }

function handleWheel(e) {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

function handleMouseDown(e) {
  if (e.button !== 0) return
  isDragging.value = true
  startX.value = e.clientX - offsetX.value
  startY.value = e.clientY - offsetY.value
}

function handleMouseMove(e) {
  if (!isDragging.value) return
  offsetX.value = e.clientX - startX.value
  offsetY.value = e.clientY - startY.value
}

function handleMouseUp() {
  isDragging.value = false
}

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
  if (e.key === '0') resetTransform()
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
}

async function handleSave() {
  try {
    const res = await fetch(currentSrc.value)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coolapk-${Date.now()}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  } catch {}
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="lightbox-overlay">
      <!-- 关闭按钮 -->
      <button class="lightbox-close" @click="emit('close')" title="关闭 (Esc)">✕</button>

      <!-- 上一张 -->
      <button v-if="showNav && hasPrev" class="lightbox-nav lightbox-prev" @click="goPrev" title="上一张 (←)">‹</button>

      <!-- 图片 -->
      <div
        class="lightbox-image-wrapper"
        @wheel.prevent="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @click.self="emit('close')"
      >
        <img
          :src="currentSrc"
          :style="{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotate}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
          draggable="false"
        >
      </div>

      <!-- 下一张 -->
      <button v-if="showNav && hasNext" class="lightbox-nav lightbox-next" @click="goNext" title="下一张 (→)">›</button>

      <!-- 计数器 -->
      <div v-if="showNav" class="lightbox-counter">{{ currentIndex + 1 }} / {{ images.length }}</div>

      <!-- 工具栏 -->
      <div class="lightbox-toolbar">
        <button @click="zoomOut" title="缩小 (-)">🔍-</button>
        <button @click="zoomIn" title="放大 (+)">🔍+</button>
        <button @click="resetTransform" title="重置 (0)">↺</button>
        <button @click="handleSave" title="保存">💾</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.lightbox-close {
  position: fixed;
  top: 16px;
  right: 16px;
  background: rgba(255,255,255,0.15);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  z-index: 10001;
  transition: background 0.15s;
}

.lightbox-close:hover {
  background: rgba(255,255,255,0.3);
}

.lightbox-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.15);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
  z-index: 10001;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-nav:hover {
  background: rgba(255,255,255,0.3);
}

.lightbox-prev {
  left: 16px;
}

.lightbox-next {
  right: 16px;
}

.lightbox-image-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.lightbox-image-wrapper img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  user-select: none;
  transition: transform 0.1s;
}

.lightbox-counter {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
}

.lightbox-toolbar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 8px;
  background: rgba(0,0,0,0.5);
  border-radius: 8px;
}

.lightbox-toolbar button {
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.lightbox-toolbar button:hover {
  background: rgba(255,255,255,0.2);
}
</style>
