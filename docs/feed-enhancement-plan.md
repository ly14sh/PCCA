# PCCA 动态功能优化规划

基于 c001apk 项目分析，优化 PCCA 的动态交互功能。

## 功能清单

### 1. 动态卡片操作栏
- [ ] 点赞 - `/v6/feed/like` 或 `/v6/feed/unlike`
- [ ] 收藏 - 本地收藏 + API 收藏状态
- [ ] 分享 - 复制链接/分享码
- [ ] 举报 - `/v6/feed/report`
- [ ] 拉黑 - `/v6/user/block`
- [ ] 删除（自己的动态）- `/v6/feed/delete`
- [ ] 评论快捷入口

### 2. 评论功能
- [ ] 评论列表加载
- [ ] 评论排序切换（热门/时间）
- [ ] 点赞评论
- [ ] 回复评论
- [ ] 评论操作（举报/拉黑/删除）
- [ ] 查看对话树
- [ ] 发布评论

### 3. 发布动态
- [ ] 文本动态发布
- [ ] 图片上传（OSS）
- [ ] 话题选择
- [ ] 机型选择

## API 端点（参考 c001apk）

```javascript
// 动态操作
POST /v6/feed/like?id={feedId}
POST /v6/feed/unlike?id={feedId}
POST /v6/feed/favorite?id={feedId}  // 收藏
POST /v6/feed/delete?id={feedId}
POST /v6/feed/report?id={feedId}    // 举报

// 评论
GET  /v6/feed/replyList?id={feedId}&listType=lastupdate_desc&page=1
POST /v6/feed/reply?id={feedId}&type=feed
POST /v6/feed/likeReply?id={replyId}
POST /v6/feed/unLikeReply?id={replyId}

// 用户
POST /v6/user/follow?uid={uid}
POST /v6/user/unfollow?uid={uid}
POST /v6/user/block?uid={uid}

// 发布动态
POST /v6/feed/createFeed
  - message: 文本内容
  - picArr: 图片数组
  - topicId: 话题ID
```

## 实现顺序

### Phase 1: 动态卡片增强（优先）
1. 添加操作栏 UI（点赞/评论/分享/更多）
2. 点赞交互 + 状态同步
3. 收藏功能（本地存储）
4. 分享（复制链接）

### Phase 2: 评论详情优化
1. 评论排序切换
2. 点赞评论
3. 回复评论入口
4. 评论发布

### Phase 3: 高级功能
1. 举报/拉黑
2. 删除自己的动态
3. 发布动态

## 当前状态

- PCCA v2.0.1 已发布
- 基础动态卡片渲染正常
- 详情页有基础评论展示
- 需要添加交互操作

## 参考

- c001apk: https://github.com/bggRGjQaUbCoE/c001apk
- Coolapk-API-Collect: https://github.com/Coolapk-UWP/Coolapk-API-Collect
