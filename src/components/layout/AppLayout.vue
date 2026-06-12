<script setup>
import AppSidebar from './AppSidebar.vue'
import AppTopBar from './AppTopBar.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- 侧边栏 -->
    <AppSidebar />
    <!-- 主内容区 -->
    <div class="main-content flex-1 flex flex-col overflow-hidden">
      <AppTopBar />
      <main class="flex-1 overflow-y-auto" style="background: var(--bg-primary)">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-primary);
  padding: 20px;
}
</style>
