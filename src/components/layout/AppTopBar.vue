<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()

const handleRefresh = () => {
  // 触发当前页面刷新
  window.location.reload()
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">{{ route.meta.title || '首页' }}</div>
    <div class="topbar-actions">
      <button class="icon-btn" @click="settingsStore.toggleTheme()" :title="settingsStore.theme === 'dark' ? '切换浅色' : '切换深色'">
        {{ settingsStore.theme === 'dark' ? '🌙' : '☀️' }}
      </button>
      <button class="icon-btn" @click="handleRefresh" title="刷新">🔄</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.topbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.topbar-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--radius);
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
