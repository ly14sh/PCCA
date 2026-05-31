import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/feed/:id',
    name: 'feed-detail',
    component: () => import('@/views/FeedDetailPage.vue'),
    meta: { title: '动态详情' },
  },
  {
    path: '/user/:uid',
    name: 'user-profile',
    component: () => import('@/views/UserProfilePage.vue'),
    meta: { title: '用户主页' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchPage.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/create',
    name: 'create-feed',
    component: () => import('@/views/CreateFeedPage.vue'),
    meta: { title: '发动态' },
  },
  {
    path: '/channels',
    name: 'channels',
    component: () => import('@/views/ChannelsPage.vue'),
    meta: { title: '频道' },
  },
  {
    path: '/page',
    name: 'page-channel',
    component: () => import('@/views/PageChannel.vue'),
    meta: { title: '频道' },
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('@/views/MessagesPage.vue'),
    meta: { title: '消息' },
  },
  {
    path: '/messages/:uid',
    name: 'message-detail',
    component: () => import('@/views/MessageDetailPage.vue'),
    meta: { title: '私信' },
  },
  {
    path: '/app/:id',
    name: 'app-detail',
    component: () => import('@/views/AppDetailPage.vue'),
    meta: { title: '应用详情' },
  },
  {
    path: '/profile',
    name: 'my-profile',
    component: () => import('@/views/MyProfilePage.vue'),
    meta: { title: '我的' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: { title: '设置' },
  },
  {
    path: '/topic/:tag',
    name: 'topic',
    component: () => import('@/views/TopicPage.vue'),
    meta: { title: '话题' },
  },
  {
    path: '/product/:id',
    name: 'product',
    component: () => import('@/views/ProductPage.vue'),
    meta: { title: '数码产品' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 路由守卫：更新标题
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 酷安` : '酷安'
})

export default router
