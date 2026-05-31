<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useAuthApi } from '@/composables/useApi'
import { decodeUser } from '@/utils/format'
import LoginModal from '@/components/login/LoginModal.vue'

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const { webLogin } = useAuthApi()

const showLogin = ref(false)
const fontSize = ref(settingsStore.fontSize || 14)
const cacheSize = ref('计算中...')
const proxy = ref('')
const deviceCode = ref('')

const themeColors = [
  { name: '绿色', value: '#0DC26F' },
  { name: '蓝色', value: '#1E90FF' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '橙色', value: '#F59E0B' },
  { name: '红色', value: '#EF4444' },
  { name: '粉色', value: '#EC4899' },
]

async function loadSettings() {
  try {
    proxy.value = await window.kuan.store.get('proxy') || ''
    const code = await window.kuan.store.get('deviceCode')
    if (code) deviceCode.value = code
    // 计算缓存大小
    await calcCacheSize()
  } catch {}
}

async function calcCacheSize() {
  try {
    if (window.kuan.getCacheSize) {
      const size = await window.kuan.getCacheSize()
      cacheSize.value = size || '0 MB'
    } else {
      cacheSize.value = '未知'
    }
  } catch {
    cacheSize.value = '计算失败'
  }
}

async function clearCache() {
  try {
    await window.kuan.clearCache()
    cacheSize.value = '0 MB'
    alert('缓存已清除')
  } catch {
    alert('清除失败')
  }
}

async function resetDevice() {
  if (confirm('重置设备码后需要重新登录，确定继续？')) {
    try {
      await window.kuan.resetDeviceCode()
      await userStore.logout()
      alert('设备码已重置，请重新登录')
    } catch {
      alert('重置失败')
    }
  }
}

async function saveProxy() {
  try {
    await window.kuan.store.set('proxy', proxy.value)
    alert('代理设置已保存，重启后生效')
  } catch {}
}

function setFontSize(size) {
  fontSize.value = size
  settingsStore.setFontSize(size)
  document.documentElement.style.fontSize = size + 'px'
}

function setThemeColor(color) {
  document.documentElement.style.setProperty('--accent', color)
  document.documentElement.style.setProperty('--accent-rgb', hexToRgb(color))
  localStorage.setItem('pcca_theme_color', color)
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function handleLogout() {
  if (confirm('确定退出登录？')) {
    userStore.logout()
  }
}

function openExternal(url) {
  if (window.kuan && window.kuan.openExternal) {
    window.kuan.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <!-- 用户信息 -->
    <div class="settings-card">
      <div v-if="userStore.isLoggedIn" class="user-info">
        <div class="user-avatar">👤</div>
        <div class="user-detail">
          <div class="user-name">{{ decodeUser(userStore.username) }}</div>
          <div class="user-uid">UID: {{ userStore.uid }}</div>
        </div>
        <button class="btn-secondary" @click="handleLogout">退出登录</button>
      </div>
      <div v-else class="login-section">
        <div class="login-icon">🔑</div>
        <p class="login-hint">通过酷安官方页面安全登录</p>
        <button class="btn-primary" @click="showLogin = true">去登录</button>
      </div>
    </div>

    <!-- 外观设置 -->
    <div class="settings-card">
      <h3 class="card-title">🎨 外观</h3>
      <div class="setting-item">
        <span class="setting-label">主题模式</span>
        <select :value="settingsStore.theme" @change="settingsStore.setTheme($event.target.value)">
          <option value="dark">深色</option>
          <option value="light">浅色</option>
        </select>
      </div>
      <div class="setting-item">
        <span class="setting-label">主题色</span>
        <div class="color-options">
          <button
            v-for="c in themeColors"
            :key="c.value"
            class="color-btn"
            :style="{ background: c.value }"
            :title="c.name"
            @click="setThemeColor(c.value)"
          ></button>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">字体大小</span>
        <div class="font-size-options">
          <button :class="{ active: fontSize === 12 }" @click="setFontSize(12)">小</button>
          <button :class="{ active: fontSize === 14 }" @click="setFontSize(14)">中</button>
          <button :class="{ active: fontSize === 16 }" @click="setFontSize(16)">大</button>
          <button :class="{ active: fontSize === 18 }" @click="setFontSize(18)">特大</button>
        </div>
      </div>
    </div>

    <!-- 网络设置 -->
    <div class="settings-card">
      <h3 class="card-title">🌐 网络</h3>
      <div class="setting-item column">
        <span class="setting-label">代理</span>
        <div class="proxy-input">
          <input v-model="proxy" placeholder="留空直连，如 socks5://127.0.0.1:1080">
          <button class="btn-secondary" @click="saveProxy">保存</button>
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="settings-card">
      <h3 class="card-title">💾 数据</h3>
      <div class="setting-item">
        <span class="setting-label">缓存大小</span>
        <div class="setting-value">
          <span>{{ cacheSize }}</span>
          <button class="btn-secondary" @click="clearCache">清除</button>
        </div>
      </div>
      <div class="setting-item column">
        <div class="setting-row">
          <span class="setting-label">设备码</span>
          <button class="btn-secondary" @click="resetDevice">重置</button>
        </div>
        <code class="device-code">{{ deviceCode || '未生成' }}</code>
      </div>
    </div>

    <!-- 关于 -->
    <div class="settings-card">
      <h3 class="card-title">ℹ️ 关于</h3>
      <div class="setting-item">
        <span class="setting-label">版本</span>
        <span class="setting-value">PCCA v3.0.0</span>
      </div>
      <div class="setting-item">
        <span class="setting-label">技术栈</span>
        <span class="setting-value">Vue 3 + Electron</span>
      </div>
      <div class="setting-item">
        <span class="setting-label">项目</span>
        <a href="#" @click.prevent="openExternal('https://github.com/ly14sh/PCCA')">GitHub</a>
      </div>
    </div>

    <LoginModal :visible="showLogin" @close="showLogin = false" @success="userStore.loadUser()" />
  </div>
</template>

<style scoped>
.settings-page {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  max-width: 600px;
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  font-size: 36px;
}

.user-detail {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-uid {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.login-section {
  text-align: center;
  padding: 10px 0;
}

.login-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.login-hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.setting-item.column {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.setting-label {
  font-size: 14px;
  color: var(--text-primary);
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

select {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  outline: none;
}

.color-options {
  display: flex;
  gap: 6px;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-btn:hover {
  transform: scale(1.2);
}

.font-size-options {
  display: flex;
  gap: 4px;
}

.font-size-options button {
  background: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
}

.font-size-options button.active {
  background: var(--accent);
  color: white;
}

.proxy-input {
  display: flex;
  gap: 8px;
  width: 100%;
}

.proxy-input input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 13px;
  outline: none;
}

.device-code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 6px 10px;
  border-radius: 4px;
  word-break: break-all;
  white-space: pre-wrap;
  width: 100%;
  max-height: 80px;
  overflow-y: auto;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius);
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

a {
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}
</style>
