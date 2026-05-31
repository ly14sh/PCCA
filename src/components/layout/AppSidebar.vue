<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageApi } from '@/composables/useApi'
import { ref, onMounted } from 'vue'
import { decodeUser } from '@/utils/format'
import LoginModal from '@/components/login/LoginModal.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { getUnreadCount } = useMessageApi()

const unreadCount = ref(0)
const showLogin = ref(false)

const navItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/create', icon: '✏️', label: '发动态' },
  { path: '/channels', icon: '📡', label: '频道' },
  { path: '/messages', icon: '💬', label: '消息', badge: true },
  { path: '/search', icon: '🔍', label: '搜索' },
  { path: '/profile', icon: '👤', label: '我的' },
  { path: '/settings', icon: '⚙️', label: '设置' },
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleLogin = () => {
  if (userStore.isLoggedIn) {
    if (confirm('确定退出登录？')) {
      userStore.logout()
    }
  } else {
    showLogin.value = true
  }
}

onMounted(async () => {
  try {
    const res = await getUnreadCount()
    if (res && res.data) {
      unreadCount.value = res.data.unread || 0
    }
  } catch {}
})
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar-header">
      <div class="logo">📱 酷安</div>
    </div>

    <!-- 导航 -->
    <nav class="sidebar-nav">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.badge && unreadCount > 0" class="nav-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </router-link>
    </nav>

    <!-- 登录/用户 -->
    <div class="sidebar-footer">
      <button class="nav-item login-btn" @click="handleLogin">
        <span class="nav-icon">{{ userStore.isLoggedIn ? '👤' : '🔑' }}</span>
        <span class="nav-label">{{ userStore.isLoggedIn ? decodeUser(userStore.username) : '登录' }}</span>
      </button>
    </div>

    <LoginModal :visible="showLogin" @close="showLogin = false" @success="userStore.loadUser()" />
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.15s ease;
  position: relative;
  border: none;
  background: none;
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-badge {
  margin-left: auto;
  background: var(--red);
  color: white;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.sidebar-footer {
  padding: 8px 0;
  border-top: 1px solid var(--border);
}

.login-btn {
  font-size: 13px;
}

.login-btn .nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
</style>
