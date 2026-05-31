<script setup>
defineProps({
  count: { type: Number, default: 3 }
})
</script>

<template>
  <div v-for="i in count" :key="i" class="skeleton-card">
    <div class="skeleton-header">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-user">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line shorter"></div>
      </div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
    </div>
    <div class="skeleton-footer">
      <div class="skeleton-line tiny"></div>
      <div class="skeleton-line tiny"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.skeleton-user {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 6px;
}

.skeleton-line.short { width: 80px; }
.skeleton-line.shorter { width: 50px; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.tiny { width: 40px; height: 10px; }

.skeleton-body {
  margin-bottom: 14px;
}

.skeleton-footer {
  display: flex;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
</style>
