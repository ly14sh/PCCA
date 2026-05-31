// ===== 酷安 API Composable =====
// 封装 IPC 调用，提供统一的 loading/error 状态管理

import { ref } from 'vue'

// Mock 层：浏览器环境（无 Electron）时提供桩函数
const isElectron = !!(window.kuan)
const mockKuan = {
  getFeed: async () => ({ data: [] }),
  getHeadline: async () => ({ data: [] }),
  getFeedPage: async () => ({ data: [] }),
  getFeedDetail: async () => ({ data: {} }),
  getFollowFeedList: async () => ({ data: [] }),
  getMyFeedList: async () => ({ data: [] }),
  fetch: async () => ({ data: [] }),
  getInit: async () => ({ data: [] }),
  getReplyList: async () => ({ data: [] }),
  getReplyListSorted: async () => ({ data: [] }),
  postReply: async () => ({ data: 1 }),
  likeReply: async () => ({ data: 1 }),
  unlikeReply: async () => ({ data: 1 }),
  getUserInfo: async () => ({ data: {} }),
  getUserSpace: async () => ({ data: {} }),
  getUserFeedList: async () => ({ data: [] }),
  getUserReplyList: async () => ({ data: [] }),
  followUser: async () => ({ data: 1 }),
  unfollowUser: async () => ({ data: 1 }),
  search: async () => ({ data: [] }),
  searchSuggest: async () => ({ data: [] }),
  getTopicDetail: async () => ({ data: {} }),
  getTopicFeedList: async () => ({ data: [] }),
  getProductDetail: async () => ({ data: {} }),
  getProductFeedList: async () => ({ data: [] }),
  getNotificationList: async () => ({ data: [] }),
  getMessageList: async () => ({ data: [] }),
  getUnreadCount: async () => ({ data: { count: 0 } }),
  readNotification: async () => ({ data: 1 }),
  likeFeed: async () => ({ data: 1 }),
  unlikeFeed: async () => ({ data: 1 }),
  favoriteFeed: async () => ({ data: 1 }),
  reportFeed: async () => ({ data: 1 }),
  deleteFeed: async () => ({ data: 1 }),
  createFeed: async () => ({ data: 1 }),
  login: async () => ({ code: -1, message: '浏览器模式不支持登录' }),
  sendSms: async () => ({ code: -1, message: '浏览器模式不支持短信' }),
  checkLoginInfo: async () => ({ data: {} }),
  logout: async () => ({ data: 1 }),
  webLogin: async () => ({ code: -1, message: '浏览器模式不支持登录' }),
  getUser: () => null,
  isLoggedIn: () => false,
}

function getKuan() {
  return window.kuan || mockKuan
}

if (!isElectron) {
  console.warn('[PCCA] 浏览器模式，使用 Mock API。请在 Electron 中运行以使用真实 API。')
}

// ===== 通用请求包装 =====
async function apiCall(fn, ...args) {
  try {
    const res = await fn(...args)
    if (res && res.status === -1) {
      throw new Error(res.message || '请求失败')
    }
    return res
  } catch (err) {
    console.error('[API Error]', err.message)
    throw err
  }
}

// ===== Feed 相关 =====
export function useFeedApi() {
  const loading = ref(false)
  const error = ref(null)
  const data = ref([])

  async function getFeed(page = 1) {
    loading.value = true
    error.value = null
    try {
      const res = await apiCall(getKuan().getFeed, page)
      data.value = res.data || []
      return res
    } catch (e) {
      error.value = e.message
      return { data: [] }
    } finally {
      loading.value = false
    }
  }

  async function getHeadline(page = 1) {
    loading.value = true
    error.value = null
    try {
      const res = await apiCall(getKuan().getHeadline, page)
      data.value = res.data || []
      return res
    } catch (e) {
      error.value = e.message
      return { data: [] }
    } finally {
      loading.value = false
    }
  }

  async function getFeedPage(params) {
    return apiCall(getKuan().getFeedPage, params)
  }

  async function getFeedDetail(id) {
    return apiCall(getKuan().getFeedDetail, id)
  }

  async function getFollowFeedList(page = 1) {
    return apiCall(getKuan().getFollowFeedList, page)
  }

  async function getMyFeedList(page = 1) {
    return apiCall(getKuan().getMyFeedList, page)
  }

  async function fetch(path) {
    return apiCall(getKuan().fetch, path)
  }

  // 动态操作
  async function likeFeed(id) { return apiCall(getKuan().likeFeed, id) }
  async function unlikeFeed(id) { return apiCall(getKuan().unlikeFeed, id) }
  async function favoriteFeed(id) { return apiCall(getKuan().favoriteFeed, id) }
  async function reportFeed(id, reason) { return apiCall(getKuan().reportFeed, id, reason) }
  async function deleteFeed(id) { return apiCall(getKuan().deleteFeed, id) }
  async function createFeed(data) { return apiCall(getKuan().createFeed, data) }

  return {
    loading, error, data,
    getFeed, getHeadline, getFeedPage, getFeedDetail,
    getFollowFeedList, getMyFeedList, fetch,
    likeFeed, unlikeFeed, favoriteFeed, reportFeed, deleteFeed, createFeed,
  }
}

// ===== 评论相关 =====
export function useReplyApi() {
  async function getReplyList(id, page = 1) {
    return apiCall(getKuan().getReplyList, id, page)
  }

  async function getReplyListSorted(id, page = 1, listType = 'lastupdate_desc') {
    return apiCall(getKuan().getReplyListSorted, id, page, listType)
  }

  async function postReply(id, message, type = 'feed') {
    return apiCall(getKuan().postReply, id, message, type)
  }

  async function likeReply(id) { return apiCall(getKuan().likeReply, id) }
  async function unlikeReply(id) { return apiCall(getKuan().unlikeReply, id) }

  return { getReplyList, getReplyListSorted, postReply, likeReply, unlikeReply }
}

// ===== 用户相关 =====
export function useUserApi() {
  async function getUserInfo(uid) {
    return apiCall(getKuan().getUserInfo, uid)
  }

  async function getUserSpace(uid) {
    return apiCall(getKuan().getUserSpace, uid)
  }

  async function getUserFeedList(uid, page = 1) {
    return apiCall(getKuan().getUserFeedList, uid, page)
  }

  async function getUserReplyList(uid, page = 1) {
    return apiCall(getKuan().getUserReplyList, uid, page)
  }

  async function followUser(uid) { return apiCall(getKuan().followUser, uid) }
  async function unfollowUser(uid) { return apiCall(getKuan().unfollowUser, uid) }

  return { getUserInfo, getUserSpace, getUserFeedList, getUserReplyList, followUser, unfollowUser }
}

// ===== 搜索相关 =====
export function useSearchApi() {
  const loading = ref(false)
  const results = ref([])

  async function search(keyword, page = 1, type = 'feed', sort = 'default') {
    loading.value = true
    try {
      const res = await apiCall(getKuan().search, keyword, page, type, sort)
      results.value = res.data || []
      return res
    } catch (e) {
      results.value = []
      return { data: [] }
    } finally {
      loading.value = false
    }
  }

  async function searchSuggest(keyword) {
    return apiCall(getKuan().searchSuggest, keyword)
  }

  return { loading, results, search, searchSuggest }
}

// ===== 话题相关 =====
export function useTopicApi() {
  async function getTopicDetail(tag) {
    return apiCall(getKuan().getTopicDetail, tag)
  }

  async function getTopicFeedList(tag, page = 1, listType = 'lastupdate_desc') {
    return apiCall(getKuan().getTopicFeedList, tag, page, listType)
  }

  return { getTopicDetail, getTopicFeedList }
}

export function useProductApi() {
  async function getProductDetail(id) {
    return apiCall(getKuan().getProductDetail, id)
  }

  async function getProductFeedList(id, page = 1) {
    return apiCall(getKuan().getProductFeedList, id, page)
  }

  return { getProductDetail, getProductFeedList }
}

// ===== 消息/通知相关 =====
export function useMessageApi() {
  async function getNotificationList(page = 1) {
    return apiCall(getKuan().getNotificationList, page)
  }

  async function getMessageList(page = 1) {
    return apiCall(getKuan().getMessageList, page)
  }

  async function getUnreadCount() {
    return apiCall(getKuan().getUnreadCount)
  }

  async function readNotification(id) {
    return apiCall(getKuan().readNotification, id)
  }

  return { getNotificationList, getMessageList, getUnreadCount, readNotification }
}

// ===== 登录相关 =====
export function useAuthApi() {
  async function login(username, password, captcha, requestHash, loginType) {
    return apiCall(getKuan().login, username, password, captcha, requestHash, loginType)
  }

  async function sendSms(phone, requestHash) {
    return apiCall(getKuan().sendSms, phone, requestHash)
  }

  async function checkLoginInfo() {
    return apiCall(getKuan().checkLoginInfo)
  }

  async function logout() {
    return apiCall(getKuan().logout)
  }

  async function webLogin() {
    return apiCall(getKuan().webLogin)
  }

  function getUser() {
    return getKuan().getUser()
  }

  function isLoggedIn() {
    return getKuan().isLoggedIn()
  }

  return { login, sendSms, checkLoginInfo, logout, webLogin, getUser, isLoggedIn }
}

// ===== 初始化 =====
export function useInitApi() {
  async function getInit() {
    return apiCall(getKuan().getInit)
  }

  return { getInit }
}
