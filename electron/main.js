const { app, BrowserWindow, ipcMain, session, protocol, net, shell } = require('electron')
const path = require('path')
const Store = require('electron-store')

// 禁用代理
delete process.env.HTTPS_PROXY
delete process.env.HTTP_PROXY

const { CoolapkAPI } = require('./coolapk')

let mainWindow
let store
let api

// ===== 恢复 Session Cookie =====
async function restoreSessionCookies() {
  const saved = store.get('user')
  if (saved && (saved.token || saved.SESSID)) {
    const ses = session.defaultSession
    const domain = '.coolapk.com'
    const cookiesToSet = []
    if (saved.token) cookiesToSet.push({ url: 'https://coolapk.com', name: 'token', value: saved.token, domain, path: '/', secure: true, httpOnly: false })
    if (saved.uid) cookiesToSet.push({ url: 'https://coolapk.com', name: 'uid', value: saved.uid, domain, path: '/', secure: true, httpOnly: false })
    if (saved.username) cookiesToSet.push({ url: 'https://coolapk.com', name: 'username', value: saved.username, domain, path: '/', secure: true, httpOnly: false })
    if (saved.SESSID) cookiesToSet.push({ url: 'https://coolapk.com', name: 'SESSID', value: saved.SESSID, domain, path: '/', secure: true, httpOnly: true })

    for (const c of cookiesToSet) {
      try { await ses.cookies.set(c) } catch (e) { console.error('[Cookie]', c.name, e.message) }
    }
    console.log('[Session] Restored', cookiesToSet.length, 'cookies for:', saved.username)
  }
}

// ===== IPC Handlers =====
function registerIPC() {
  // Feed
  ipcMain.handle('api:getFeed', (_, params) => api.getFeed(params))
  ipcMain.handle('api:getFeedPage', (_, params) => api.getFeedPage(params))
  ipcMain.handle('api:getFeedDetail', (_, id) => api.getFeedDetail(id))
  ipcMain.handle('api:getReplyList', (_, id, page) => api.getReplyList(id, page))
  ipcMain.handle('api:getReplyListSorted', (_, id, page, listType) => api.getReplyListSorted(id, page, listType))
  ipcMain.handle('api:getHeadline', (_, page) => api.getHeadline(page))
  ipcMain.handle('api:getInit', () => api.getInit())
  ipcMain.handle('api:fetch', (_, path) => api.fetch(path))

  // Auth
  ipcMain.handle('api:login', (_, username, password, captcha, requestHash, loginType) => api.login(username, password, captcha, requestHash, loginType))
  ipcMain.handle('api:sendSms', (_, phone, requestHash) => api.sendSms(phone, requestHash))
  ipcMain.handle('api:checkLoginInfo', () => api.checkLoginInfo())
  ipcMain.handle('api:logout', () => api.logout(session.defaultSession))
  ipcMain.handle('api:getUser', () => api.getUser())
  ipcMain.handle('api:isLoggedIn', () => api.isLoggedIn())
  ipcMain.handle('api:webLogin', () => handleWebLogin())
  ipcMain.handle('api:fetchCaptchaImage', () => api.fetchCaptchaImage())

  // User
  ipcMain.handle('api:getUserInfo', (_, uid) => api.fetch(`/v6/user/profile?uid=${uid}`))
  ipcMain.handle('api:getUserSpace', (_, uid) => api.getUserSpace(uid))
  ipcMain.handle('api:getUserFeedList', (_, uid, page) => api.getUserFeedList(uid, page))
  ipcMain.handle('api:getUserReplyList', (_, uid, page) => api.getUserReplyList(uid, page))

  // Search
  ipcMain.handle('api:search', (_, keyword, page, type, sort) => api.search(keyword, page, type, sort))
  ipcMain.handle('api:searchSuggest', (_, keyword) => api.searchSuggest(keyword))

  // Topic
  ipcMain.handle('api:getTopicDetail', (_, tag) => api.getTopicDetail(tag))
  ipcMain.handle('api:getTopicFeedList', (_, tag, page, listType) => api.getTopicFeedList(tag, page, listType))
  // Product
  ipcMain.handle('api:getProductDetail', (_, id) => api.getProductDetail(id))
  ipcMain.handle('api:getProductFeedList', (_, id, page) => api.getProductFeedList(id, page))

  // Messages
  ipcMain.handle('api:getNotificationList', (_, page) => api.getNotificationList(page))
  ipcMain.handle('api:getMessageList', (_, page) => api.getMessageList(page))
  ipcMain.handle('api:getUnreadCount', () => api.getUnreadCount())
  ipcMain.handle('api:readNotification', (_, id) => api.readNotification(id))

  // Feed actions
  ipcMain.handle('api:likeFeed', (_, id) => api.likeFeed(id))
  ipcMain.handle('api:unlikeFeed', (_, id) => api.unlikeFeed(id))
  ipcMain.handle('api:likeReply', (_, id) => api.likeReply(id))
  ipcMain.handle('api:unlikeReply', (_, id) => api.unlikeReply(id))
  ipcMain.handle('api:followUser', (_, uid) => api.followUser(uid))
  ipcMain.handle('api:unfollowUser', (_, uid) => api.unfollowUser(uid))
  ipcMain.handle('api:favoriteFeed', (_, id) => api.favoriteFeed(id))
  ipcMain.handle('api:reportFeed', (_, id, reason) => api.reportFeed(id, reason))
  ipcMain.handle('api:deleteFeed', (_, id) => api.deleteFeed(id))
  ipcMain.handle('api:postReply', (_, id, message, type) => api.postReply(id, message, type))
  ipcMain.handle('api:createFeed', (_, data) => api.createFeed(data))

  // My feeds
  ipcMain.handle('api:getMyFeedList', (_, page) => api.getMyFeedList(page))
  ipcMain.handle('api:getFollowFeedList', (_, page) => api.getFollowFeedList(page))

  // Store
  ipcMain.handle('store:get', (_, key) => store.get(key))
  ipcMain.handle('store:set', (_, key, val) => store.set(key, val))

  // System
  ipcMain.handle('clearCache', async () => {
    await mainWindow.webContents.session.clearCache()
    await mainWindow.webContents.session.clearStorageData()
    return { success: true }
  })
  ipcMain.handle('getCacheSize', async () => {
    try {
      const { app } = require('electron')
      const fs = require('fs')
      const path = require('path')
      
      const cachePath = app.getPath('cache')
      const pccaCachePath = path.join(cachePath, 'pcca-v3')
      
      function getDirSize(dirPath) {
        let size = 0
        try {
          const files = fs.readdirSync(dirPath, { withFileTypes: true })
          for (const file of files) {
            const fullPath = path.join(dirPath, file.name)
            if (file.isDirectory()) {
              size += getDirSize(fullPath)
            } else {
              try {
                const stats = fs.statSync(fullPath)
                size += stats.size
              } catch {}
            }
          }
        } catch {}
        return size
      }
      
      let size = 0
      if (fs.existsSync(pccaCachePath)) {
        size = getDirSize(pccaCachePath)
      }
      
      // Also add browser cache
      try {
        const browserCacheSize = await mainWindow.webContents.session.getStorageSize()
        size += browserCacheSize
      } catch {}
      
      if (size > 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB'
      if (size > 1024) return (size / 1024).toFixed(1) + ' KB'
      return size > 0 ? size + ' B' : '0 MB'
    } catch (e) {
      console.error('getCacheSize error:', e)
      return '0 MB'
    }
  })
  ipcMain.handle('resetDeviceCode', () => {
    api.resetDeviceCode()
    return { success: true }
  })
  ipcMain.handle('openExternal', (_, url) => shell.openExternal(url))
}

// ===== WebView 登录 =====
function handleWebLogin() {
  return new Promise(async (resolve) => {
    let resolved = false
    
    // 创建独立的登录 session，清除旧 cookie
    const loginSession = session.fromPartition('login-window')
    await loginSession.clearStorageData()
    
    const loginWin = new BrowserWindow({
      width: 420, height: 700, title: '酷安账号登录',
      backgroundColor: '#ffffff', autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, session: loginSession },
    })

    loginWin.loadURL('https://account.coolapk.com/auth/login?type=coolapk')

    const handleSuccess = (event, url) => {
      if (url.includes('www.coolapk.com') || url.includes('coolapk.com/home')) {
        event.preventDefault()
        if (!resolved) { resolved = true; extractCookies(loginWin, resolve) }
      }
    }

    loginWin.webContents.on('will-redirect', handleSuccess)
    loginWin.webContents.on('will-navigate', handleSuccess)

    const cookieCheck = setInterval(async () => {
      if (resolved) { clearInterval(cookieCheck); return }
      try {
        const cookies = await loginSession.cookies.get({ domain: '.coolapk.com' })
        if (cookies.find(c => c.name === 'token') && cookies.find(c => c.name === 'uid')) {
          clearInterval(cookieCheck)
          if (!resolved) { resolved = true; extractCookiesFromSession(loginSession, loginWin, resolve) }
        }
      } catch {}
    }, 1000)

    loginWin.on('closed', () => {
      clearInterval(cookieCheck)
      if (!resolved) { resolved = true; resolve({ code: -1, message: '登录窗口已关闭' }) }
    })
  })
}

function extractCookiesFromSession(loginSession, loginWin, resolve) {
  loginSession.cookies.get({ domain: '.coolapk.com' }).then(cookies => {
    const result = {}
    for (const c of cookies) result[c.name] = c.value
    if (result.token && result.uid) {
      api.cookies = { ...api.cookies, token: result.token, uid: result.uid, username: result.username || '', SESSID: result.SESSID || '' }
      if (api.store) api.store.set('user', { ...api.cookies })
      loginWin.close()
      resolve({ code: 0, message: '登录成功', data: api.cookies })
    } else {
      loginWin.close()
      resolve({ code: -1, message: '登录后未获取到有效凭证' })
    }
  }).catch(() => {
    loginWin.close()
    resolve({ code: -1, message: '获取登录信息失败' })
  })
}

// ===== 窗口创建 =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: '酷安', backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webviewTag: true,
    },
  })
  mainWindow.setMenuBarVisibility(false)

  // 开发模式加载 Vite dev server，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ===== 应用启动 =====
app.whenReady().then(async () => {
  store = new Store({ name: 'config', cwd: app.getPath('userData') })
  api = new CoolapkAPI(store)

  await restoreSessionCookies()

  // 注册自定义协议
  protocol.handle('emoji', (request) => {
    const fileName = decodeURIComponent(request.url.replace('emoji://', ''))
    const filePath = path.join(__dirname, '..', 'src', 'renderer', 'emoji', fileName)
    return net.fetch('file:///' + filePath.replace(/\\/g, '/'))
  })

  protocol.handle('coolapk-img', (request) => {
    const realUrl = request.url.replace('coolapk-img://', 'https://')
    return net.fetch(realUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; Pixel 7 Build/UPB1.231005.007) +CoolMarket/13.3.2-2404301',
        'Referer': 'https://api.coolapk.com/',
      },
    })
  })

  // 代理设置
  const proxy = store.get('proxy')
  if (proxy) session.defaultSession.setProxy({ proxyRules: proxy })

  registerIPC()
  createWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
