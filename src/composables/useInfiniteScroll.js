import { ref, onMounted, onUnmounted } from 'vue'

export function useInfiniteScroll(containerRef, options = {}) {
  const { threshold = 200, onLoadMore } = options
  const isLoading = ref(false)
  const hasMore = ref(true)

  let observer = null
  let sentinel = null

  function check() {
    if (!containerRef.value || isLoading.value || !hasMore.value) return
    const el = containerRef.value
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining < threshold) {
      loadMore()
    }
  }

  async function loadMore() {
    if (isLoading.value || !hasMore.value) return
    isLoading.value = true
    try {
      await onLoadMore()
    } catch (e) {
      console.error('Load more error:', e)
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    hasMore.value = true
    isLoading.value = false
  }

  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', check, { passive: true })
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', check)
    }
  })

  return { isLoading, hasMore, reset, loadMore }
}
