# PCCA - 酷安 API 说明文档

> 基于酷安 APP v13.3.2 逆向分析，社区非官方文档整理
> 最后更新：2026-05-29

---

## 目录

- [基础信息](#基础信息)
- [认证机制](#认证机制)
- [请求头构造](#请求头构造)
- [登录流程](#登录流程)
- [首页与信息流](#首页与信息流)
- [动态详情与评论](#动态详情与评论)
- [搜索](#搜索)
- [话题/频道](#话题频道)
- [用户](#用户)
- [通知与消息](#通知与消息)
- [动态操作（点赞/收藏/关注等）](#动态操作点赞收藏关注等)
- [发布动态/评论](#发布动态评论)
- [分页机制](#分页机制)
- [通用 fetch 方法](#通用-fetch-方法)
- [已知限制与注意事项](#已知限制与注意事项)

---

## 基础信息

| 项目 | 值 |
|------|-----|
| API 基础地址 | `https://api.coolapk.com` |
| 账号系统地址 | `https://account.coolapk.com` |
| 移动端页面 | `https://m.coolapk.com` |
| API 版本 | v6 |
| 参考 APP 版本 | 13.3.2 (Code: 2404301) |
| Android SDK | 34 (Android 14) |

---

## 认证机制

酷安使用 **双 Token + Cookie** 认证体系：

### 1. X-App-Token (V2)

每次请求都需要在 Header 中携带，**有效期约 10 分钟**，需动态生成。

**生成算法：**

```
1. timestamp = 当前 Unix 时间戳（秒）
2. base64Timestamp = base64(timestamp) 去掉 '='
3. md5Timestamp = md5(timestamp)
4. md5DeviceCode = md5(deviceCode)

5. token = "token://com.coolapk.market/dcf01e569c1e3db93a3d0fcf191a622c?{md5Timestamp}${md5DeviceCode}&com.coolapk.market"
6. base64Token = base64(token) 去掉 '='
7. md5Base64Token = md5(base64Token)
8. md5Token = md5(token)

9. saltPrefix = "$2y$10${base64Timestamp}/{md5Token}"  (取前31字符 + "u")
10. bcryptResult = bcrypt(md5Base64Token, saltPrefix前31+"u")
11. appToken = "v2" + base64(bcryptResult)
```

### 2. X-App-Device (Device Code)

设备标识码，**每个客户端实例生成一次后固定使用**。

**生成规则：**

```
aid=<随机32位hex>; ; ; mac=<随机MAC>; manufacturer=Google; brand=Pixel; model=Pixel 7; buildNumber=UPB1.231005.007; null
```

将上述字符串 Base64 编码后**反转**。

### 3. Cookie 认证

登录成功后服务器返回以下 Cookie：

| Cookie | 说明 |
|--------|------|
| `token` | 登录 Token（API 请求用） |
| `SESSID` | 会话 ID |
| `uid` | 用户 ID |
| `username` | 用户名 |

---

## 请求头构造

所有 API 请求必须携带以下 Header：

```http
User-Agent: Dalvik/2.1.0 (Linux; U; Android 14; sdk_gphone64_arm64 Build/UPB1.231005.007) +CoolMarket/13.3.2-2404301
X-Requested-With: XMLHttpRequest
X-App-Id: com.coolapk.market
X-App-Token: <v2 token>
X-App-Version: 13.3.2
X-App-Code: 2404301
X-Api-Version: 13
X-Sdk-Int: 34
X-Sdk-Locale: zh-CN
X-App-Device: <device code>
X-Dark-Mode: 0
X-App-Channel: coolapk
X-App-Mode: universal
X-App-Supported: 2404301
Cookie: token=xxx; SESSID=xxx; uid=xxx; username=xxx
```

> ⚠️ **重要**：`X-App-Token` 和 `X-App-Device` 缺一不可，否则返回 403。

---

## 登录流程

### 方案说明

酷安 APP **本身使用 WebView 加载登录页**（非原生表单），PCCA 采用相同方案：

```
1. Electron 打开 BrowserWindow → 加载 https://account.coolapk.com/auth/loginByCoolapk
2. 用户在官方页面完成登录（可能需要验证码）
3. 登录成功后页面重定向，从 Cookie 中提取 token/uid/username
4. 保存到 electron-store 持久化
```

### 相关 API（备用/辅助）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/loginByCoolapk` | GET | 获取登录页面 HTML，提取 `requestHash` |
| `/auth/showCaptchaImage` | GET | 获取验证码图片（需带 SESSID Cookie） |
| `/auth/loginByCoolapk` | POST | 提交登录表单（需 requestHash + SESSID） |
| `/v6/account/checkLoginInfo` | GET | 验证登录状态是否有效 |

### 登录 POST 参数

```
submit=1
requestHash=<从页面提取>
login=<手机号或邮箱>
password=<密码>
randomNumber=<随机7位数字>
captcha=<验证码（如需要）>
```

> ⚠️ `account.coolapk.com` **必须使用浏览器 UA**，使用 APP UA 会返回空 body。

### 短信验证码登录流程

```
1. GET /auth/loginByCoolapk → 提取 requestHash
2. POST checkAdmin → 验证手机号是否支持短信登录
3. POST type=sms → 发送验证码
4. POST type=sms + captcha → 提交验证码完成登录
```

---

## 首页与信息流

### 获取首页 Tab 配置

```
GET /v6/main/init
```

返回 14 个 Tab 的配置信息（名称、URL、类型）。

### 获取首页信息流

```
GET /v6/main/indexV8?page=1
```

返回头条 Banner + 快捷入口 + 帖子列表。

### 获取头条列表

```
GET /v6/main/headline?page=1
```

### 获取关注用户动态

```
GET /v6/page/dataList?url=/v6/user/followFeedList?page=1
```

> ⚠️ **注意**：`#` 开头的 URL 必须通过 `/v6/page/dataList?url=` 代理访问。

---

## 动态详情与评论

### 获取动态详情

```
GET /v6/feed/detail?id=<feedId>
```

### 获取评论列表

```
GET /v6/feed/replyList?id=<feedId>&page=1&discussMode=1&feedType=feed
```

**带排序的评论列表：**

```
GET /v6/feed/replyList?id=<feedId>&page=1&listType=lastupdate_desc&discussMode=1&feedType=feed&blockStatus=0&fromFeedAuthor=0
```

`listType` 可选值：
- `lastupdate_desc` — 最新
- `dateline_desc` — 最早
- `popular` — 最热

---

## 搜索

### 搜索接口

```
GET /v6/search?type=<type>&searchValue=<keyword>&page=1
```

**type 可选值：**

| type | 说明 |
|------|------|
| `feed` | 动态/帖子 |
| `apk` | 应用 |
| `product` | 数码产品 |
| `user` | 用户 |
| `topic` | 话题 |

**动态搜索附加参数：**

```
feedType=all&sort=default
```

`sort` 可选值：`default`（默认）、`hot`（热门）、`new`（最新）

### 搜索候选/联想

```
GET /v6/search/suggestSearchWordsNew?searchValue=<keyword>
```

---

## 话题/频道

### 获取话题详情

```
GET /v6/topic/newTagDetail?tag=<tagName>
```

### 获取话题下的动态列表

```
GET /v6/topic/tagFeedList?tag=<tagName>&page=1&listType=lastupdate_desc
```

`listType` 可选值：
- `lastupdate_desc` — 最新回复
- `dateline_desc` — 最新发布
- `popular` — 最热门

---

## 用户

### 获取用户空间信息

```
GET /v6/user/space?uid=<uid>
```

返回用户头像、简介、关注/粉丝数、动态数等。

### 获取用户动态列表

```
GET /v6/user/feedList?uid=<uid>&page=1
```

### 获取用户回复列表

```
GET /v6/user/replyList?uid=<uid>&page=1
```

---

## 通知与消息

### 获取通知列表

```
GET /v6/notification/list?page=1
```

### 获取私信列表

```
GET /v6/message/list?page=1
```

### 获取未读消息数

```
GET /v6/notification/getUnreadCount
```

### 标记通知已读

```
POST /v6/notification/read?id=<notificationId>
```

---

## 动态操作（点赞/收藏/关注等）

| 操作 | 方法 | 路径 |
|------|------|------|
| 点赞动态 | POST | `/v6/feed/like?id=<feedId>` |
| 取消点赞 | POST | `/v6/feed/unlike?id=<feedId>` |
| 点赞评论 | POST | `/v6/feed/likeReply?id=<replyId>` |
| 取消点赞评论 | POST | `/v6/feed/unLikeReply?id=<replyId>` |
| 收藏动态 | POST | `/v6/feed/favorite?id=<feedId>` |
| 关注用户 | POST | `/v6/user/follow?uid=<uid>` |
| 取消关注 | POST | `/v6/user/unfollow?uid=<uid>` |
| 删除动态 | POST | `/v6/feed/delete?id=<feedId>` |
| 举报动态 | POST | `/v6/feed/report?id=<feedId>&reason=<reason>` |

> 以上接口均需登录状态（携带 Cookie）。

---

## 发布动态/评论

### 发布评论

```
POST /v6/feed/reply?id=<feedId>&type=feed
Content-Type: application/x-www-form-urlencoded

message=<评论内容>
```

### 发布动态

```
POST /v6/feed/createFeed
Content-Type: application/x-www-form-urlencoded

message=<动态内容>&picArr=<图片URL数组JSON>&topicId=<话题ID（可选）>
```

---

## 分页机制

酷安 API 使用两种分页方式：

### 1. Page 参数

```
?page=1
?page=2
...
```

### 2. Item 参数（滑动分页）

```
?firstItem=<第一条ID>&lastItem=<最后一条ID>&page=1
```

用于 `dataList` 接口，通过首尾 item ID 实现无缝翻页。

---

## 通用 fetch 方法

PCCA 提供一个通用请求方法，可用于访问任意酷安 API 路径：

```javascript
// 主进程调用
await coolapkAPI.fetch('/v6/some/new/endpoint?page=1');

// 渲染进程调用
const result = await window.kuan.fetch('/v6/some/new/endpoint?page=1');
```

> 适用于探索未文档化的 API 端点。

---

## 已知限制与注意事项

### 网络相关

1. **必须直连**：PCCA 运行时禁止使用代理，代理会导致酷安服务器拒绝请求
2. **GitHub 推送需代理**：`git -c http.proxy=http://127.0.0.1:7890 push origin master --tags`
3. **account.coolapk.com 必须用浏览器 UA**：APP UA 返回空 body
4. **m.coolapk.com 需用 APP UA**：否则页面布局不正确

### API 相关

1. `X-App-Token` 有效期约 10 分钟，需每次请求重新生成
2. `#` 开头的 URL 必须通过 `/v6/page/dataList?url=` 代理
3. 部分 API 需要登录状态才能访问
4. 酷安 CDN 图片拒绝浏览器 UA，需用 APP UA 代理下载

### Electron 相关

1. `<webview>` 标签无法注入自定义请求头，因此内容渲染使用原生 HTML 而非 WebView
2. `target="_blank"` 链接需使用 `shell.openExternal()` 调用默认浏览器
3. electron-store 必须在 `app.whenReady()` 之后初始化

---

## 参考项目

- [Coolapk-UWP](https://github.com/coolapk/Coolapk-UWP) — API 文档主要参考
- [Coolapk-API-Collect](https://github.com/coolapk/Coolapk-API-Collect) — API 端点收集
- [c001apk](https://github.com/ckatica/c001apk) — 首页 Tab 系统参考
