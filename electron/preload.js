const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kuan', {
  // Feed
  getFeed: (params) => ipcRenderer.invoke('api:getFeed', params),
  getFeedPage: (params) => ipcRenderer.invoke('api:getFeedPage', params),
  getFeedDetail: (id) => ipcRenderer.invoke('api:getFeedDetail', id),
  getReplyList: (id, page) => ipcRenderer.invoke('api:getReplyList', id, page),
  getReplyListSorted: (id, page, listType) => ipcRenderer.invoke('api:getReplyListSorted', id, page, listType),
  getHeadline: (page) => ipcRenderer.invoke('api:getHeadline', page),
  getInit: () => ipcRenderer.invoke('api:getInit'),
  fetch: (path) => ipcRenderer.invoke('api:fetch', path),

  // Auth
  login: (username, password, captcha, requestHash, loginType) => ipcRenderer.invoke('api:login', username, password, captcha, requestHash, loginType),
  sendSms: (phone, requestHash) => ipcRenderer.invoke('api:sendSms', phone, requestHash),
  checkLoginInfo: () => ipcRenderer.invoke('api:checkLoginInfo'),
  logout: () => ipcRenderer.invoke('api:logout'),
  getUser: () => ipcRenderer.invoke('api:getUser'),
  isLoggedIn: () => ipcRenderer.invoke('api:isLoggedIn'),
  webLogin: () => ipcRenderer.invoke('api:webLogin'),
  fetchCaptchaImage: () => ipcRenderer.invoke('api:fetchCaptchaImage'),

  // User
  getUserInfo: (uid) => ipcRenderer.invoke('api:getUserInfo', uid),
  getUserSpace: (uid) => ipcRenderer.invoke('api:getUserSpace', uid),
  getUserFeedList: (uid, page) => ipcRenderer.invoke('api:getUserFeedList', uid, page),
  getUserReplyList: (uid, page) => ipcRenderer.invoke('api:getUserReplyList', uid, page),

  // Search
  search: (keyword, page, type, sort) => ipcRenderer.invoke('api:search', keyword, page, type, sort),
  searchSuggest: (keyword) => ipcRenderer.invoke('api:searchSuggest', keyword),

  // Topic
  getTopicDetail: (tag) => ipcRenderer.invoke('api:getTopicDetail', tag),
  getTopicFeedList: (tag, page, listType) => ipcRenderer.invoke('api:getTopicFeedList', tag, page, listType),
  // Product
  getProductDetail: (id) => ipcRenderer.invoke('api:getProductDetail', id),
  getProductFeedList: (id, page) => ipcRenderer.invoke('api:getProductFeedList', id, page),

  // Messages
  getNotificationList: (page) => ipcRenderer.invoke('api:getNotificationList', page),
  getMessageList: (page) => ipcRenderer.invoke('api:getMessageList', page),
  getUnreadCount: () => ipcRenderer.invoke('api:getUnreadCount'),
  readNotification: (id) => ipcRenderer.invoke('api:readNotification', id),

  // Feed actions
  likeFeed: (id) => ipcRenderer.invoke('api:likeFeed', id),
  unlikeFeed: (id) => ipcRenderer.invoke('api:unlikeFeed', id),
  likeReply: (id) => ipcRenderer.invoke('api:likeReply', id),
  unlikeReply: (id) => ipcRenderer.invoke('api:unlikeReply', id),
  followUser: (uid) => ipcRenderer.invoke('api:followUser', uid),
  unfollowUser: (uid) => ipcRenderer.invoke('api:unfollowUser', uid),
  favoriteFeed: (id) => ipcRenderer.invoke('api:favoriteFeed', id),
  reportFeed: (id, reason) => ipcRenderer.invoke('api:reportFeed', id, reason),
  deleteFeed: (id) => ipcRenderer.invoke('api:deleteFeed', id),
  postReply: (id, message, type) => ipcRenderer.invoke('api:postReply', id, message, type),
  createFeed: (data) => ipcRenderer.invoke('api:createFeed', data),

  // My feeds
  getMyFeedList: (page) => ipcRenderer.invoke('api:getMyFeedList', page),
  getFollowFeedList: (page) => ipcRenderer.invoke('api:getFollowFeedList', page),

  // Store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, val) => ipcRenderer.invoke('store:set', key, val),
  },

  // System
  clearCache: () => ipcRenderer.invoke('clearCache'),
  getCacheSize: () => ipcRenderer.invoke('getCacheSize'),
  resetDeviceCode: () => ipcRenderer.invoke('resetDeviceCode'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
})
