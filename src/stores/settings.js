import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref(localStorage.getItem('pcca-theme') || 'dark')
  const fontSize = ref(Number(localStorage.getItem('pcca-fontsize')) || 14)

  function setTheme(t) {
    theme.value = t
    localStorage.setItem('pcca-theme', t)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function applyTheme() {
    document.documentElement.classList.toggle('light', theme.value === 'light')
  }

  function setFontSize(size) {
    fontSize.value = size
    localStorage.setItem('pcca-fontsize', String(size))
    document.documentElement.style.fontSize = size + 'px'
  }

  // 初始化
  applyTheme()

  return { theme, fontSize, setTheme, toggleTheme, applyTheme, setFontSize }
})
