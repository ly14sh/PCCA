<script setup>
import { fixImgUrl } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true }
})
</script>

<template>
  <div class="apk-card">
    <div class="apk-icon">
      <img v-if="item.logo" :src="fixImgUrl(item.logo)" @error="$event.target.style.display='none'">
      <span v-else>📦</span>
    </div>
    <div class="apk-info">
      <div class="apk-name">{{ item.title || item.shorttitle }}</div>
      <div class="apk-meta">
        <span v-if="item.apkTypeName" class="apk-type">{{ item.apkTypeName }}</span>
        <span v-if="item.version" class="apk-version">v{{ item.version }}</span>
        <span v-if="item.starScore" class="apk-score">⭐ {{ item.starScore }}</span>
      </div>
      <div v-if="item.description" class="apk-desc">{{ item.description }}</div>
    </div>
  </div>
</template>

<style scoped>
.apk-card {
  display: flex;
  gap: 14px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.apk-card:hover {
  border-color: var(--accent);
}

.apk-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.apk-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.apk-icon span {
  font-size: 28px;
}

.apk-info {
  flex: 1;
  min-width: 0;
}

.apk-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.apk-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.apk-type,
.apk-version,
.apk-score {
  font-size: 12px;
  color: var(--text-muted);
}

.apk-type {
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 4px;
}

.apk-desc {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
