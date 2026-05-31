<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useShortcuts } from '@/composables/useShortcuts'
import AppLayout from '@/components/layout/AppLayout.vue'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

// 注册全局快捷键
useShortcuts()

onMounted(async () => {
  // 加载用户状态
  await userStore.loadUser()
  // 应用主题
  settingsStore.applyTheme()
  // 应用字体大小
  const savedFontSize = localStorage.getItem('pcca_font_size')
  if (savedFontSize) {
    document.documentElement.style.fontSize = savedFontSize + 'px'
  }
  // 应用主题色
  const savedColor = localStorage.getItem('pcca_theme_color')
  if (savedColor) {
    document.documentElement.style.setProperty('--accent', savedColor)
    const r = parseInt(savedColor.slice(1, 3), 16)
    const g = parseInt(savedColor.slice(3, 5), 16)
    const b = parseInt(savedColor.slice(5, 7), 16)
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`)
  }
})
</script>

<template>
  <AppLayout />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
}

#app {
  height: 100vh;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
</style>
