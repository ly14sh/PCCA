const crypto = require('crypto');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const bcrypt = require('bcryptjs');

const PROXY = 'http://127.0.0.1:7897';
const BASE_URL = 'https://api.coolapk.com';

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

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

// Base64 (不带 padding)
function base64(str) {
  return Buffer.from(str, 'utf8').toString('base64').replace(/=/g, '');
}

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

  // bcrypt salt: "$2y$10${base64Timestamp}/{md5Token}" 前31个字符 + "u"
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

function buildHeaders() {
  return {
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
  };
}

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = buildHeaders();

    if (body) {
      body = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const agent = new HttpsProxyAgent(PROXY, { rejectUnauthorized: false });

    const req = https.request(url.href, { method, headers, agent }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = new URL(res.headers.location, BASE_URL);
          resolve(request(loc.pathname + loc.search, method, body));
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

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

class CoolapkAPI {
  constructor() {
    _deviceCode = createDeviceCode();
    console.log('Device code:', _deviceCode);
    this.cookies = {};
  }

  setCookies(token, username, uid) {
    this.cookies = { token, username, uid };
  }

  async getFeed(page = 1) {
    return request(`/v6/main/indexV8?page=${page}`);
  }

  async getFeedPage({ url, page = 1, firstItem, lastItem }) {
    let path = `/v6/page/dataList?url=${encodeURIComponent(url)}&page=${page}`;
    if (firstItem) path += `&firstItem=${firstItem}`;
    if (lastItem) path += `&lastItem=${lastItem}`;
    return request(path);
  }

  async getInit() {
    return request('/v6/main/init');
  }

  async getHeadline(page = 1) {
    return request(`/v6/main/headline?page=${page}`);
  }

  async getFeedDetail(id) {
    return request(`/v6/feed/detail?id=${id}`);
  }

  async getReplyList(id, page = 1) {
    return request(`/v6/feed/replyList?id=${id}&page=${page}&discussMode=1&feedType=feed`);
  }

  async login(username, password) {
    const formBody = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const result = await request('/v6/user/login', 'POST', formBody);
    if (result.data) {
      this.setCookies(result.data.token, result.data.username, result.data.uid);
    }
    return result;
  }

  async search(keyword, page = 1, type = 'feed', sort = 'default') {
    const typeMap = { feed: 'feed', apk: 'apk', product: 'product', user: 'user', topic: 'topic' };
    const t = typeMap[type] || 'feed';
    let path = `/v6/search?type=${t}&searchValue=${encodeURIComponent(keyword)}&page=${page}`;
    if (t === 'feed') {
      path += `&feedType=all&sort=${sort}`;
    }
    return request(path);
  }

  async searchSuggest(keyword) {
    return request(`/v6/search/suggestSearchWordsNew?searchValue=${encodeURIComponent(keyword)}`);
  }

  async fetch(path) {
    return request(path);
  }

  async getTopicDetail(tag) {
    return request(`/v6/topic/newTagDetail?tag=${encodeURIComponent(tag)}`);
  }

  async getTopicFeedList(tag, page = 1, listType = 'lastupdate_desc') {
    return request(`/v6/topic/tagFeedList?tag=${encodeURIComponent(tag)}&listType=${listType}&page=${page}`);
  }
}

module.exports = { CoolapkAPI };
