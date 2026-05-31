import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!(user.value && (user.value.token || user.value.SESSID)))
  const username = computed(() => user.value?.username || '')
  const uid = computed(() => user.value?.uid || '')

  async function loadUser() {
    try {
      const u = await window.kuan.getUser()
      user.value = u
    } catch {
      user.value = null
    }
  }

  async function logout() {
    try {
      await window.kuan.logout()
    } catch {}
    user.value = null
  }

  return { user, isLoggedIn, username, uid, loadUser, logout }
})
