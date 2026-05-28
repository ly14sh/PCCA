const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kuan', {
  getFeed: (params) => ipcRenderer.invoke('api:getFeed', params),
  getFeedPage: (params) => ipcRenderer.invoke('api:getFeedPage', params),
  getFeedDetail: (id) => ipcRenderer.invoke('api:getFeedDetail', id),
  getReplyList: (id, page) => ipcRenderer.invoke('api:getReplyList', id, page),
  login: (username, password, captcha, requestHash, loginType) => ipcRenderer.invoke('api:login', username, password, captcha, requestHash, loginType),
  sendSms: (phone, requestHash) => ipcRenderer.invoke('api:sendSms', phone, requestHash),
  checkLoginInfo: () => ipcRenderer.invoke('api:checkLoginInfo'),
  logout: () => ipcRenderer.invoke('api:logout'),
  getUser: () => ipcRenderer.invoke('api:getUser'),
  isLoggedIn: () => ipcRenderer.invoke('api:isLoggedIn'),
  getUserInfo: (uid) => ipcRenderer.invoke('api:getUserInfo', uid),
  search: (keyword, page, type, sort) => ipcRenderer.invoke('api:search', keyword, page, type, sort),
  searchSuggest: (keyword) => ipcRenderer.invoke('api:searchSuggest', keyword),
  getTopicDetail: (tag) => ipcRenderer.invoke('api:getTopicDetail', tag),
  getTopicFeedList: (tag, page, listType) => ipcRenderer.invoke('api:getTopicFeedList', tag, page, listType),
  getInit: () => ipcRenderer.invoke('api:getInit'),
  getHeadline: (page) => ipcRenderer.invoke('api:getHeadline', page),
  fetch: (path) => ipcRenderer.invoke('api:fetch', path),
  fetchCaptchaImage: (requestHash) => ipcRenderer.invoke('api:fetchCaptchaImage', requestHash),
  webLogin: () => ipcRenderer.invoke('api:webLogin'),
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, val) => ipcRenderer.invoke('store:set', key, val),
  },
});
