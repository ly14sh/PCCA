<script setup>
import { ref, computed } from 'vue'
import { useFeedApi } from '@/composables/useApi'
import { formatNum } from '@/utils/format'

const props = defineProps({
  item: { type: Object, required: true }
})

const { fetch: apiFetch } = useFeedApi()

const selected = ref(null)
const voted = ref(false)
const results = ref([])
const totalVotes = computed(() => results.value.reduce((sum, r) => sum + (r.voteCount || 0), 0))

// 解析投票选项
const options = computed(() => {
  if (!props.item.voteInfo) return []
  return props.item.voteInfo.options || []
})

async function handleVote() {
  if (!selected.value || voted.value) return
  try {
    const res = await apiFetch(`/v6/vote/option?voteId=${props.item.voteInfo.id}&optionId=${selected.value}`)
    voted.value = true
    // 加载结果
    await loadResults()
  } catch (e) {
    console.error('Vote error:', e)
  }
}

async function loadResults() {
  try {
    const res = await apiFetch(`/v6/vote/info?voteId=${props.item.voteInfo.id}`)
    results.value = res.data?.options || []
    voted.value = true
  } catch {}
}

function getPercent(option) {
  if (totalVotes.value === 0) return 0
  return Math.round((option.voteCount || 0) / totalVotes.value * 100)
}
</script>

<template>
  <div v-if="options.length > 0" class="vote-card">
    <div class="vote-title">{{ item.voteInfo.title || '投票' }}</div>
    <div class="vote-desc" v-if="item.voteInfo.description">{{ item.voteInfo.description }}</div>

    <!-- 未投票：选项选择 -->
    <div v-if="!voted" class="vote-options">
      <label
        v-for="opt in options"
        :key="opt.id"
        class="vote-option"
        :class="{ selected: selected === opt.id }"
      >
        <input type="radio" v-model="selected" :value="opt.id">
        <span class="option-text">{{ opt.text }}</span>
      </label>
      <button class="vote-btn" @click="handleVote" :disabled="!selected">
        投票
      </button>
    </div>

    <!-- 已投票：结果显示 -->
    <div v-else class="vote-results">
      <div v-for="opt in (results.length > 0 ? results : options)" :key="opt.id" class="result-item">
        <div class="result-header">
          <span class="result-text">{{ opt.text }}</span>
          <span class="result-percent">{{ getPercent(opt) }}%</span>
        </div>
        <div class="result-bar">
          <div class="result-fill" :style="{ width: getPercent(opt) + '%' }"></div>
        </div>
        <div class="result-count">{{ formatNum(opt.voteCount || 0) }} 票</div>
      </div>
      <div class="vote-total">共 {{ formatNum(totalVotes) }} 人投票</div>
    </div>
  </div>
</template>

<style scoped>
.vote-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
}

.vote-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.vote-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.vote-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vote-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
}

.vote-option:hover {
  border-color: var(--accent);
}

.vote-option.selected {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.05);
}

.vote-option input {
  accent-color: var(--accent);
}

.option-text {
  font-size: 14px;
  color: var(--text-primary);
}

.vote-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
  align-self: flex-end;
}

.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vote-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-text {
  font-size: 14px;
  color: var(--text-primary);
}

.result-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.result-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.result-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.result-count {
  font-size: 12px;
  color: var(--text-muted);
}

.vote-total {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  margin-top: 4px;
}
</style>
