import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export function useShortcuts() {
  const router = useRouter()

  const shortcuts = {
    'r': () => location.reload(),
    '/': () => router.push('/search'),
    'Escape': () => history.back(),
    '1': () => router.push('/'),
    '2': () => router.push('/channels'),
    '3': () => router.push('/messages'),
    '4': () => router.push('/search'),
    '5': () => router.push('/profile'),
  }

  function handleKeydown(e) {
    // 忽略输入框内的快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return
    }

    const key = e.key.toLowerCase()
    if (shortcuts[key]) {
      e.preventDefault()
      shortcuts[key]()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })

  return { shortcuts }
}
