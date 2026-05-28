const { app, BrowserWindow, ipcMain, session, protocol, net } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

// 不设置代理 — account.coolapk.com 直连即可（Python 已验证）
delete process.env.HTTPS_PROXY;
delete process.env.HTTP_PROXY;
console.log('[Proxy] 已禁用代理，使用直连');

const { CoolapkAPI } = require('./src/api/coolapk');

let mainWindow;
const api = new CoolapkAPI(store);

// ===== IPC Handlers =====
ipcMain.handle('api:getFeed', async (_, params) => {
  return api.getFeed(params);
});

ipcMain.handle('api:getFeedPage', async (_, params) => {
  return api.getFeedPage(params);
});

ipcMain.handle('api:getFeedDetail', async (_, id) => {
  return api.getFeedDetail(id);
});

ipcMain.handle('api:getReplyList', async (_, id, page) => {
  return api.getReplyList(id, page);
});

ipcMain.handle('api:login', async (_, username, password, captcha, requestHash, loginType) => {
  return await api.login(username, password, captcha, requestHash, loginType);
});

ipcMain.handle('api:sendSms', async (_, phone, requestHash) => {
  return await api.sendSms(phone, requestHash);
});

ipcMain.handle('api:checkLoginInfo', async () => {
  return await api.checkLoginInfo();
});

ipcMain.handle('api:logout', async () => {
  return await api.logout();
});

ipcMain.handle('api:getUser', () => {
  return api.getUser();
});

ipcMain.handle('api:isLoggedIn', () => {
  return api.isLoggedIn();
});

ipcMain.handle('api:getUserInfo', async (_, uid) => {
  return api.fetch(`/v6/user/profile?uid=${uid}`);
});

ipcMain.handle('api:search', async (_, keyword, page, type, sort) => {
  return api.search(keyword, page, type, sort);
});

ipcMain.handle('api:searchSuggest', async (_, keyword) => {
  return api.searchSuggest(keyword);
});

ipcMain.handle('api:getTopicDetail', async (_, tag) => {
  return api.getTopicDetail(tag);
});

ipcMain.handle('api:getTopicFeedList', async (_, tag, page, listType) => {
  return api.getTopicFeedList(tag, page, listType);
});

ipcMain.handle('api:getInit', async () => {
  return api.getInit();
});

ipcMain.handle('api:getHeadline', async (_, page) => {
  return api.getHeadline(page);
});

ipcMain.handle('api:fetch', async (_, path) => {
  return api.fetch(path);
});

ipcMain.handle('api:fetchCaptchaImage', async () => {
  return api.fetchCaptchaImage();
});

// WebView 登录：打开酷安登录页，登录成功后从 Cookie 提取认证信息
ipcMain.handle('api:webLogin', async () => {
  return new Promise((resolve, reject) => {
    const loginWin = new BrowserWindow({
      width: 420,
      height: 700,
      title: '酷安账号登录',
      backgroundColor: '#ffffff',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    loginWin.loadURL('https://account.coolapk.com/auth/login?type=coolapk');

    // 监听页面跳转 — 登录成功后重定向到 www.coolapk.com
    loginWin.webContents.on('will-redirect', (event, url) => {
      console.log('[WebLogin] redirect:', url);
      if (url.includes('www.coolapk.com') || url.includes('coolapk.com/home')) {
        event.preventDefault();
        extractLoginCookies(loginWin, resolve);
      }
    });

    loginWin.webContents.on('will-navigate', (event, url) => {
      console.log('[WebLogin] navigate:', url);
      if (url.includes('www.coolapk.com') || url.includes('coolapk.com/home')) {
        event.preventDefault();
        extractLoginCookies(loginWin, resolve);
      }
    });

    // 某些情况下登录成功不跳转，而是通过 Cookie 变化感知
    // 定期检查 Cookie 中是否已有 token
    const cookieCheck = setInterval(async () => {
      try {
        const cookies = await loginWin.webContents.session.cookies.get({ domain: '.coolapk.com' });
        const tokenCookie = cookies.find(c => c.name === 'token');
        const uidCookie = cookies.find(c => c.name === 'uid');
        if (tokenCookie && uidCookie) {
          clearInterval(cookieCheck);
          extractLoginCookies(loginWin, resolve);
        }
      } catch (e) { /* ignore */ }
    }, 1000);

    loginWin.on('closed', () => {
      clearInterval(cookieCheck);
      resolve({ code: -1, message: '登录窗口已关闭' });
    });
  });
});

function extractLoginCookies(loginWin, resolve) {
  loginWin.webContents.session.cookies.get({ domain: '.coolapk.com' }).then(cookies => {
    const result = {};
    for (const c of cookies) {
      result[c.name] = c.value;
    }
    console.log('[WebLogin] cookies:', Object.keys(result).join(', '));

    if (result.token && result.uid) {
      // 写入 API 实例
      api.cookies = {
        ...api.cookies,
        token: result.token,
        uid: result.uid,
        username: result.username || '',
        SESSID: result.SESSID || '',
      };
      if (api.store) {
        api.store.set('coolapk_cookies', api.cookies);
      }
      loginWin.close();
      resolve({ code: 0, message: '登录成功', data: api.cookies });
    } else {
      loginWin.close();
      resolve({ code: -1, message: '登录后未获取到有效凭证' });
    }
  }).catch(err => {
    console.error('[WebLogin] cookie extract error:', err);
    loginWin.close();
    resolve({ code: -1, message: '获取登录信息失败' });
  });
}

ipcMain.handle('store:get', (_, key) => store.get(key));
ipcMain.handle('store:set', (_, key, val) => store.set(key, val));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: '酷安',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('src/renderer/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // 注册自定义协议：coolapk-img:// 代理图片请求
  protocol.handle('coolapk-img', (request) => {
    const realUrl = request.url.replace('coolapk-img://', 'https://');
    return net.fetch(realUrl, {
      headers: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; Pixel 7 Build/UPB1.231005.007) +CoolMarket/13.3.2-2404301',
        'Referer': 'https://api.coolapk.com/',
      },
    });
  });

  // 如用户配置了代理，则设置（未配置则直连）
  const proxy = store.get('proxy');
  if (proxy) {
    session.defaultSession.setProxy({ proxyRules: proxy });
  }
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
