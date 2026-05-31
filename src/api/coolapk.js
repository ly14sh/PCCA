

const crypto = require('crypto');
const https = require('https');
const bcrypt = require('bcryptjs');
const FormData = require('form-data');

const BASE_URL = 'https://api.coolapk.com';
const ACCOUNT_URL = 'https://account.coolapk.com';

// Node.js 18+ 原生 fetch，自动走系统代理（electron-store 优先读取 proxy 配置）
function nodeFetch(url, options = {}) {
  // 设置超时，避免永久挂起
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, 15000);
  const opts = { ...options, signal: controller.signal };
  return globalThis.fetch(url, opts)
    .finally(() => clearTimeout(timeout))
    .catch(e => {
      if (e.name === 'AbortError') throw new Error('Request timeout (15s)');
      throw e;
    });
}

const CONFIG = {
  appId: 'com.coolapk.market',
  appVersion: '13.3.2',
  appCode: '2404301',
  apiVersion: '13',
  sdkInt: '34',
  sdkLocale: 'zh-CN',
  userAgent: 'Dalvik/2.1.0 (Linux; U; Android 14; sdk_gphone64_arm64 Build/UPB1.231005.007) +CoolMarket/13.3.2-2404301',
};

// Device Code 生成 (base64后反转)
function createDeviceCode() {
  const parts = [
    randomHex(16), // aid
    '', '',        // 占位
    randomMac(),   // mac
    'Google',      // manufacturer
    'Pixel',       // brand
    'Pixel 7',     // model
    'UPB1.231005.007', // buildNumber
    'null',
  ];
  const device = parts.join('; ');
  const b64 = Buffer.from(device).toString('base64');
  return b64.split('').reverse().join('');
}

function randomHex(len) {
  return crypto.randomBytes(len).toString('hex').toUpperCase();
}

function randomMac() {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'));
  return bytes.join(':');
}

const md5 = (str) => crypto.createHash('md5').update(str, 'utf8').digest('hex');

// Base64 (不带 padding)
const base64 = (str) => Buffer.from(str, 'utf8').toString('base64').replace(/=/g, '');

// X-App-Token V2 生成
function generateAppTokenV2(deviceCode) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const base64Timestamp = base64(timestamp);
  const md5Timestamp = md5(timestamp);
  const md5DeviceCode = md5(deviceCode);

  const token = `token://com.coolapk.market/dcf01e569c1e3db93a3d0fcf191a622c?${md5Timestamp}$${md5DeviceCode}&com.coolapk.market`;
  const base64Token = base64(token);
  const md5Base64Token = md5(base64Token);
  const md5Token = md5(token);

  const saltPrefix = `$2y$10$${base64Timestamp}/${md5Token}`;
  const bcryptSalt = saltPrefix.substring(0, 31) + 'u';

  const bcryptResult = bcrypt.hashSync(md5Base64Token, bcryptSalt);
  const appToken = `v2${base64(bcryptResult)}`;
  return appToken;
}

// X-App-Token V1 生成 (备用)
function generateAppTokenV1(deviceCode) {
  const timestamp = Math.floor(Date.now() / 1000);
  const hexTs = '0x' + timestamp.toString(16);
  const md5Ts = md5(timestamp.toString());
  const md5Device = md5(deviceCode);
  const token = `token://com.coolapk.market/c67ef5943784d09750dcfbb31020f0ab?${md5Ts}$${md5Device}&com.coolapk.market`;
  const md5Token = md5(Buffer.from(token).toString('base64'));
  return `${md5Token}${md5Device}${hexTs}`;
}

let _deviceCode = '';

function buildHeaders(extra = {}) {
  const headers = {
    'User-Agent': CONFIG.userAgent,
    'X-Requested-With': 'XMLHttpRequest',
    'X-App-Id': CONFIG.appId,
    'X-App-Token': generateAppTokenV2(_deviceCode),
    'X-App-Version': CONFIG.appVersion,
    'X-App-Code': CONFIG.appCode,
    'X-Api-Version': CONFIG.apiVersion,
    'X-Sdk-Int': CONFIG.sdkInt,
    'X-Sdk-Locale': CONFIG.sdkLocale,
    'X-App-Device': _deviceCode,
    'X-Dark-Mode': '0',
    'X-App-Channel': 'coolapk',
    'X-App-Mode': 'universal',
    'X-App-Supported': CONFIG.appCode,
    ...extra,
  };
  return headers;
}

function request(path, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = buildHeaders(extraHeaders);

    if (body) {
      if (Buffer.isBuffer(body)) {
        headers['Content-Length'] = body.length;
      } else if (extraHeaders['Content-Type'] === 'application/json') {
        body = JSON.stringify(body);
        headers['Content-Length'] = Buffer.byteLength(body);
      } else {
        body = typeof body === 'string' ? body : JSON.stringify(body);
        headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
        headers['Content-Length'] = Buffer.byteLength(body);
      }
    }

    // 登录状态：带 token 和 SESSID cookie
    if (this && this.cookies) {
      const parts = [];
      if (this.cookies.token) parts.push(`token=${this.cookies.token}`);
      if (this.cookies.SESSID) parts.push(`SESSID=${this.cookies.SESSID}`);
      if (this.cookies.uid) parts.push(`uid=${this.cookies.uid}`);
      if (this.cookies.username) parts.push(`username=${this.cookies.username}`);
      if (parts.length > 0) headers['Cookie'] = parts.join('; ');
    }

    console.log('[API REQUEST]', method, url.href);
    console.log('[API HEADERS]', JSON.stringify(headers, null, 2));
    console.log('[API COOKIES]', this && this.cookies ? JSON.stringify({token: this.cookies.token?.substring(0,20)+'...', SESSID: this.cookies.SESSID?.substring(0,20)+'...', uid: this.cookies.uid, username: this.cookies.username}) : 'no this/cookies');
    if (body) console.log('[API BODY]', typeof body === 'string' ? body : JSON.stringify(body));

    const req = https.request(url.href, { method, headers }, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie && this && this.cookies) {
        setCookie.forEach(c => {
          const match = c.match(/^token=([^;]+)/);
          if (match) this.cookies.token = match[1];
        });
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('[API RESPONSE]', res.statusCode, url.pathname);
        console.log('[API RESP BODY]', data.substring(0, 500));
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = new URL(res.headers.location, BASE_URL);
          resolve(request.call(this, loc.pathname + loc.search, method, body, extraHeaders));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('API response not JSON:', res.statusCode, data.substring(0, 300));
          reject(new Error(`Invalid JSON (HTTP ${res.statusCode})`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('[API ERROR]', method, url.href, e.message);
      reject(e);
    });
    if (body) req.write(body);
    req.end();
  });
}

class CoolapkAPI {
  constructor(store = null) {
    this.store = store;
    this.cookies = {};

    // 持久化 device code，避免每次重启生成新的导致 token 失效
    if (store) {
      let savedCode = store.get('deviceCode', null);
      if (!savedCode) {
        savedCode = createDeviceCode();
        store.set('deviceCode', savedCode);
        console.log('[DeviceCode] Generated new:', savedCode);
      } else {
        console.log('[DeviceCode] Restored:', savedCode);
      }
      _deviceCode = savedCode;
    } else {
      _deviceCode = createDeviceCode();
      console.log('[DeviceCode] No store, generated:', _deviceCode);
    }

    // 启动时加载已保存的登录状态
    if (store) {
      const saved = store.get('user', null);
      if (saved && (saved.token || saved.SESSID)) {
        this.cookies = {
          token: saved.token || '',
          SESSID: saved.SESSID || '',
          username: saved.username || '',
          uid: saved.uid || '',
        };
        console.log('Restored login session:', saved.username);
      }
    }
  }

  isLoggedIn() {
    return !!(this.cookies && (this.cookies.token || this.cookies.SESSID));
  }

  getUser() {
    if (!this.cookies || (!this.cookies.token && !this.cookies.SESSID)) return null;
    return { token: this.cookies.token, SESSID: this.cookies.SESSID, username: this.cookies.username, uid: this.cookies.uid };
  }

  // ===== 登录 API (account.coolapk.com) =====

  // GET 获取 requestHash + requireCaptcha
  async _fetchRequestHash() {
    const url = new URL('/auth/loginByCoolapk', ACCOUNT_URL).href;

    try {
      // 用浏览器 UA GET 登录页 HTML，从中提取 requestHash 和验证码
      // APP UA + X-Requested-With 返回空 body，必须用浏览器方式访问
      // 使用 https.request 代替 nodeFetch，确保 Cookie 正确获取
      const html = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'account.coolapk.com',
          path: '/auth/loginByCoolapk',
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 6) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
          },
        };
        const req = https.request(opts, res => {
          // 保存 Set-Cookie
          const cookies = res.headers['set-cookie'] || [];
          for (const cookieStr of cookies) {
            const m = cookieStr.match(/SESSID=([^;]+)/);
            if (m) this.cookies.SESSID = m[1];
            const f = cookieStr.match(/forward=([^;]+)/);
            if (f) this.cookies.forward = f[1];
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
      });

      console.error('[FetchHash] html length:', html.length, 'SESSID:', this.cookies.SESSID);
      if (!html) throw new Error('Empty HTML response');

      // 提取 requestHash: "requestHash : 'xxx'" 格式
      const hashMatch = html.match(/requestHash\s*:\s*'([^']+)'/);
      if (!hashMatch) throw new Error('requestHash not found in login page');
      const requestHash = hashMatch[1];

      // 验证码需要单独请求 /auth/showCaptchaImage（HTML内嵌的是1x1占位图）
      const captchaImage = await this._fetchCaptchaImage();

      return { requestHash, requireCaptcha: !!captchaImage, captchaImage };
    } catch (e) {
      throw new Error('Failed to fetch requestHash: ' + e.message);
    }
  }

  // 请求验证码图片（返回 base64 data URL）
  async _fetchCaptchaImage() {
    if (!this.cookies.SESSID) return null;
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: 'account.coolapk.com',
        path: `/auth/showCaptchaImage?${Date.now()}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 6) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://account.coolapk.com/auth/loginByCoolapk',
          'Cookie': `SESSID=${this.cookies.SESSID}${this.cookies.forward ? '; forward=' + this.cookies.forward : ''}${this.cookies.displayVersion ? '; displayVersion=' + this.cookies.displayVersion : ''}`,
        },
      };
      const req = https.request(opts, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const ct = res.headers['content-type'] || 'image/jpeg';
          resolve(`data:${ct};base64,${buf.toString('base64')}`);
        });
      });
      req.on('error', () => resolve(null));
      req.end();
    });
  }

  // 刷新验证码（重新请求验证码图片）
  async fetchCaptchaImage() {
    try {
      const captchaImage = await this._fetchCaptchaImage();
      return { captchaImage };
    } catch {
      return null;
    }
  }

  // POST 登录（账号密码 / 手机验证码）
  async _postLogin(login, password, requestHash, captcha = '', loginType = 'password') {
    const randomNum = Math.floor(Math.random() * 9999999).toString();
    let formBody = `submit=1&requestHash=${encodeURIComponent(requestHash)}&login=${encodeURIComponent(login)}&randomNumber=${randomNum}`;
    if (loginType === 'sms') {
      formBody += `&type=sms`;
    } else {
      formBody += `&password=${encodeURIComponent(password)}`;
    }
    if (captcha) formBody += `&captcha=${encodeURIComponent(captcha)}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://account.coolapk.com/auth/loginByCoolapk',
      'Cookie': this.cookies.SESSID ? `SESSID=${this.cookies.SESSID}` : '',
    };

    const result = await this._httpsPost('account.coolapk.com', '/auth/loginByCoolapk', formBody, headers);
    console.error('[Login POST] result:', JSON.stringify(result).substring(0, 300));
    return result;
  }

  // 账号密码登录（完整流程）
  async login(loginValue, password, captcha = '', cachedRequestHash = '', loginType = 'password') {
    try {
      let requestHash = cachedRequestHash;

      // 账号密码登录必须获取新的 SESSID，避免被之前的短信流程污染会话状态
      // 短信登录(SMS)可以复用 cachedRequestHash，因为本身就是同一个会话
      if (!requestHash || loginType === 'password') {
        const hashData = await this._fetchRequestHash();
        if (!hashData.requestHash) {
          return { code: -1, message: '无法获取登录请求标识，请稍后重试' };
        }
        requestHash = hashData.requestHash;
        // 如果需要验证码但没提供，返回需要验证码
        if (hashData.requireCaptcha && !captcha) {
          return { code: 2, message: '需要验证码', requestHash: hashData.requestHash, captchaImage: hashData.captchaImage };
        }
      }

      // Step 2: POST 登录（使用缓存的或新的 requestHash + 已保存的 SESSID）
      const result = await this._postLogin(loginValue, password, requestHash, captcha, loginType);
      console.error('[Login] POST result:', JSON.stringify(result).substring(0, 300));

      // _httpsPost 返回错误或非JSON
      if (result && result.error) {
        return { code: -1, message: '网络错误：' + result.error };
      } else if (result && result.raw) {
        return { code: -1, message: '服务器返回非JSON响应' };
      }

      // 登录被拦截，需要验证码
      if (result && result.requireCaptcha) {
        return { code: 2, message: '请输入验证码', requestHash: hashData.requestHash };
      }

      // result 结构: { SESSID, token, uid, username, userAvatar, ... }
      // 302 重定向时 result 来自 _httpsPost 的 302 处理，已包含 cookies
      if (result && (result.SESSID || result.token)) {
        // 合并 cookies（保留 _httpsPost 中已提取的值）
        this.cookies = {
          ...this.cookies,
          token: result.token || this.cookies.token || '',
          SESSID: result.SESSID || this.cookies.SESSID || '',
          username: result.username || this.cookies.username || loginValue,
          uid: result.uid || this.cookies.uid || '',
        };

        // 持久化到 store
        if (this.store) {
          this.store.set('user', { ...this.cookies });
        }

        return { data: result, message: '登录成功' };
      } else if (result && result.message) {
        return { code: result.code || -1, message: result.message };
      } else {
        return { code: -1, message: '登录失败，未知错误' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { code: -1, message: '网络错误：' + err.message };
    }
  }

  // 验证登录状态（调用 /v6/account/checkLoginInfo）
  async checkLoginInfo() {
    return request.call(this, '/v6/account/checkLoginInfo');
  }

  // 重置 device code（需要重新登录）
  resetDeviceCode() {
    const newCode = createDeviceCode();
    _deviceCode = newCode;
    if (this.store) {
      this.store.set('deviceCode', newCode);
    }
    console.log('[DeviceCode] Reset to:', newCode);
    return newCode;
  }

  async logout(session) {
    this.cookies = {};
    if (this.store) {
      this.store.delete('coolapk_cookies');
      this.store.delete('user');
    }
    // 清除 Electron session 中的 Cookie
    if (session) {
      try {
        const cookies = await session.cookies.get({ domain: '.coolapk.com' });
        for (const c of cookies) {
          const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
          await session.cookies.remove(url, c.name);
        }
        console.log('[Logout] Cleared', cookies.length, 'coolapk cookies');
      } catch (e) {
        console.error('[Logout] Clear cookies error:', e.message);
      }
    }
    return { data: 1 };
  }

  // 发送短信验证码（手机验证码登录用）
  // 酷安流程：先 checkAdmin 检查手机号 → 再 sms 发送验证码
  async sendSms(phone, cachedRequestHash = '') {
    try {
      let requestHash = cachedRequestHash;
      if (!requestHash) {
        const hashData = await this._fetchRequestHash();
        if (!hashData.requestHash) {
          return { code: -1, message: '无法获取请求标识' };
        }
        requestHash = hashData.requestHash;
      }
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://account.coolapk.com/auth/loginByCoolapk',
        'Cookie': this.cookies.SESSID ? `SESSID=${this.cookies.SESSID}` : '',
      };

      // Step 1: checkAdmin
      const checkBody = `submit=1&requestHash=${encodeURIComponent(requestHash)}&login=${encodeURIComponent(phone)}&type=checkAdmin`;
      const checkResult = await this._httpsPost('account.coolapk.com', '/auth/loginByCoolapk', checkBody, headers);
      if (checkResult.status !== 1) {
        // 非短信登录用户或出错
        return { code: -1, message: checkResult.message || '该账号不支持短信登录' };
      }

      // Step 2: 发送短信
      const formBody = `submit=1&requestHash=${encodeURIComponent(requestHash)}&login=${encodeURIComponent(phone)}&type=sms`;
      return this._httpsPost('account.coolapk.com', '/auth/loginByCoolapk', formBody, headers);
    } catch (err) {
      return { code: -1, message: err.message };
    }
  }

  async getFeed(page = 1) {
    return request.call(this, `/v6/main/indexV8?page=${page}`);
  }

  // HTTPS POST 辅助方法
  _httpsPost(hostname, path, body, headers) {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      };
      const req = https.request(opts, res => {
        let data = '';
        // 保存 set-cookie
        const setCookies = res.headers['set-cookie'] || [];
        for (const c of setCookies) {
          const m1 = c.match(/SESSID=([^;]+)/);
          if (m1) this.cookies.SESSID = m1[1];
          const m2 = c.match(/token=([^;]+)/);
          if (m2) this.cookies.token = m2[1];
          const m3 = c.match(/uid=([^;]+)/);
          if (m3) this.cookies.uid = m3[1];
          const m4 = c.match(/username=([^;]+)/);
          if (m4) this.cookies.username = decodeURIComponent(m4[1]);
        }

        // 302 重定向 = 登录成功
        if (res.statusCode === 302 || res.statusCode === 301) {
          const location = res.headers.location || '';
          console.error('[HTTPS POST] 302 redirect:', location, 'cookies:', JSON.stringify(this.cookies));
          // 从 Location 提取参数或直接返回成功
          resolve({
            status: 1,
            message: '登录成功',
            redirectUrl: location,
            SESSID: this.cookies.SESSID,
            token: this.cookies.token,
            uid: this.cookies.uid,
            username: this.cookies.username,
          });
          return;
        }

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data }); }
        });
      });
      req.on('error', err => resolve({ error: err.message }));
      req.write(body);
      req.end();
    });
  }

  async getFeedPage({ url, page = 1, firstItem, lastItem }) {
    let path = `/v6/page/dataList?url=${encodeURIComponent(url)}&page=${page}`;
    if (firstItem) path += `&firstItem=${firstItem}`;
    if (lastItem) path += `&lastItem=${lastItem}`;
    return request.call(this, path);
  }

  async getInit() {
    return request.call(this, '/v6/main/init');
  }

  async getHeadline(page = 1) {
    return request.call(this, `/v6/main/headline?page=${page}`);
  }

  async getFeedDetail(id) {
    return request.call(this, `/v6/feed/detail?id=${id}`);
  }

  async getReplyList(id, page = 1) {
    return request.call(this, `/v6/feed/replyList?id=${id}&page=${page}&discussMode=1&feedType=feed`);
  }

  async search(keyword, page = 1, type = 'feed', sort = 'default') {
    const typeMap = { feed: 'feed', apk: 'apk', product: 'product', user: 'user', topic: 'topic' };
    const t = typeMap[type] || 'feed';
    let path = `/v6/search?type=${t}&searchValue=${encodeURIComponent(keyword)}&page=${page}`;
    if (t === 'feed') {
      path += `&feedType=all&sort=${sort}`;
    }
    return request.call(this, path);
  }

  async searchSuggest(keyword) {
    return request.call(this, `/v6/search/suggestSearchWordsNew?searchValue=${encodeURIComponent(keyword)}`);
  }

  async fetch(path) {
    return request.call(this, path);
  }

  async getTopicDetail(tag) {
    return request.call(this, `/v6/topic/newTagDetail?tag=${encodeURIComponent(tag)}`);
  }

  async getTopicFeedList(tag, page = 1, listType = 'lastupdate_desc') {
    return request.call(this, `/v6/topic/tagFeedList?tag=${encodeURIComponent(tag)}&listType=${listType}&page=${page}`);
  }

  // ===== 数码产品 API =====

  // 获取数码产品详情
  async getProductDetail(id) {
    return request.call(this, `/v6/product/detail?id=${id}`);
  }

  // 获取数码产品动态列表
  async getProductFeedList(id, page = 1) {
    return request.call(this, `/v6/product/feedList?id=${id}&page=${page}`);
  }

  // ===== 用户主页 API =====

  // 获取用户空间信息
  async getUserSpace(uid) {
    return request.call(this, `/v6/user/space?uid=${uid}`);
  }

  // 获取用户动态列表
  async getUserFeedList(uid, page = 1) {
    return request.call(this, `/v6/user/feedList?uid=${uid}&page=${page}`);
  }

  // 获取用户回复列表
  async getUserReplyList(uid, page = 1) {
    return request.call(this, `/v6/user/replyList?uid=${uid}&page=${page}`);
  }

  // ===== 动态/消息/通知 API =====

  // 获取我的动态列表
  async getMyFeedList(page = 1) {
    return request.call(this, `/v6/user/feedList?page=${page}`);
  }

  // 获取关注动态
  async getFollowFeedList(page = 1) {
    return request.call(this, `/v6/page/dataList?url=/v6/user/followFeedList?page=${page}`);
  }

  // 获取通知列表
  async getNotificationList(page = 1) {
    return request.call(this, `/v6/notification/list?page=${page}`);
  }

  // 获取消息列表（私信）
  async getMessageList(page = 1) {
    return request.call(this, `/v6/message/list?page=${page}`);
  }

  // 获取未读消息数
  async getUnreadCount() {
    return request.call(this, `/v6/notification/getUnreadCount`);
  }

  // 标记通知已读
  async readNotification(id) {
    return request.call(this, `/v6/notification/read?id=${id}`, 'POST');
  }

  // ===== 动态操作 API =====

  // 点赞动态
  async likeFeed(id) {
    return request.call(this, `/v6/feed/like?id=${id}`, 'POST');
  }

  // 取消点赞
  async unlikeFeed(id) {
    return request.call(this, `/v6/feed/unlike?id=${id}`, 'POST');
  }

  // 点赞评论
  async likeReply(id) {
    return request.call(this, `/v6/feed/likeReply?id=${id}`, 'POST');
  }

  // 取消点赞评论
  async unlikeReply(id) {
    return request.call(this, `/v6/feed/unLikeReply?id=${id}`, 'POST');
  }

  // 关注用户
  async followUser(uid) {
    return request.call(this, `/v6/user/follow?uid=${uid}`, 'POST');
  }

  // 取消关注
  async unfollowUser(uid) {
    return request.call(this, `/v6/user/unfollow?uid=${uid}`, 'POST');
  }

  // 收藏动态（需要登录）
  async favoriteFeed(id) {
    return request.call(this, `/v6/feed/favorite?id=${id}`, 'POST');
  }

  // 举报动态
  async reportFeed(id, reason = '') {
    return request.call(this, `/v6/feed/report?id=${id}&reason=${encodeURIComponent(reason)}`, 'POST');
  }

  // 删除动态（自己的）
  async deleteFeed(id) {
    return request.call(this, `/v6/feed/delete?id=${id}`, 'POST');
  }

  // 发布评论（multipart/form-data，参考 Coolapk-Lite）
  async postReply(id, message, type = 'feed') {
    const form = new FormData();
    form.append('message', message);
    form.append('pic', '');
    return request.call(this, `/v6/feed/reply?id=${id}&type=${type}`, 'POST', form.getBuffer(), {
      'Content-Type': form.getHeaders()['content-type'],
    });
  }

  // 获取评论列表（带排序）
  async getReplyListSorted(id, page = 1, listType = 'lastupdate_desc') {
    return request.call(this, `/v6/feed/replyList?id=${id}&listType=${listType}&page=${page}&discussMode=1&feedType=feed&blockStatus=0&fromFeedAuthor=0`);
  }

  // 发布动态
  async createFeed({ message, picArr = [], topicId = '' }) {
    const body = new URLSearchParams({ message, picArr: JSON.stringify(picArr), topicId }).toString();
    return request.call(this, '/v6/feed/createFeed', 'POST', body, {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  }
}

module.exports = { CoolapkAPI };
