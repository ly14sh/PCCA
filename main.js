const { app, BrowserWindow, ipcMain, session, protocol } = require('electron');
const path = require('path');
const { CoolapkAPI } = require('./src/api/coolapk');
const Store = require('electron-store');
const https = require('https');
const http = require('http');
const { HttpsProxyAgent } = require('https-proxy-agent');

const store = new Store();
let mainWindow;
const api = new CoolapkAPI();

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

// IPC handlers
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

ipcMain.handle('api:login', async (_, username, password) => {
  const result = await api.login(username, password);
  if (result) {
    store.set('user', { username, ...result });
  }
  return result;
});

ipcMain.handle('api:getUserInfo', async (_, uid) => {
  return api.getUserInfo(uid);
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

ipcMain.handle('store:get', (_, key) => store.get(key));
ipcMain.handle('store:set', (_, key, val) => store.set(key, val));

app.whenReady().then(() => {
  // 注册自定义协议：coolapk-img:// 代理图片请求
  protocol.handle('coolapk-img', (request) => {
    const realUrl = request.url.replace('coolapk-img://', 'https://');
    return new Promise((resolve) => {
      const agent = new HttpsProxyAgent('http://127.0.0.1:7897', { rejectUnauthorized: false });
      const opts = {
        agent,
        headers: {
          'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; Pixel 7 Build/UPB1.231005.007) +CoolMarket/13.3.2-2404301',
          'Referer': 'https://api.coolapk.com/',
        },
      };
      https.get(realUrl, opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // 跟随重定向
          const loc = res.headers.location;
          const nextUrl = loc.startsWith('http') ? loc : 'https://' + loc;
          protocol.handle('coolapk-img', (req) => {
            // 递归处理交给下一轮
            return net.fetch(nextUrl);
          });
          res.resume();
          // 简单处理：直接请求重定向URL
          https.get(nextUrl, opts, (res2) => {
            const chunks = [];
            res2.on('data', c => chunks.push(c));
            res2.on('end', () => {
              const body = Buffer.concat(chunks);
              resolve(new Response(body, {
                status: res2.statusCode,
                headers: { 'content-type': res2.headers['content-type'] || 'image/jpeg' },
              }));
            });
          }).on('error', () => resolve(new Response('', { status: 502 })));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve(new Response(body, {
            status: res.statusCode,
            headers: { 'content-type': res.headers['content-type'] || 'image/jpeg' },
          }));
        });
      }).on('error', () => resolve(new Response('', { status: 502 })));
    });
  });

  // 设置代理
  const proxy = store.get('proxy', 'http://127.0.0.1:7897');
  session.defaultSession.setProxy({ proxyRules: proxy });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
