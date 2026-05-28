// ===== 酷安桌面客户端 - 前端逻辑 =====

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== 全局状态 =====
let currentPage = 'home';
let currentFeedPage = 1;
let lastItemId = null;
let loading = false;

// Tab配置（从API动态获取）
let homeTabs = [];
let currentTabIndex = 1; // 默认头条
let followSubTab = ''; // 关注子分组
let tabDataCache = {}; // 缓存各tab数据

// ===== 主题切换 =====
let isDark = localStorage.getItem('kuan-theme') !== 'light';
function applyTheme() {
  document.documentElement.classList.toggle('light', !isDark);
  const btn = $('#theme-btn');
  if (btn) btn.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('kuan-theme', isDark ? 'dark' : 'light');
}
applyTheme();

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  // 主题切换按钮
  $('#theme-btn').addEventListener('click', () => {
    isDark = !isDark;
    applyTheme();
  });

  // 导航切换
  $$('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page === 'search') {
        const box = $('#search-box');
        box.style.display = 'flex';
        $('#search-input').focus();
        return;
      }
      switchPage(page);
    });
  });

  // 刷新
  $('#refresh-btn').addEventListener('click', () => {
    if (currentPage === 'home') {
      loadHomeTab(true);
    } else {
      loadFeed(true);
    }
  });

  // 搜索
  initSearch();

  // 帖子详情
  $('#close-detail').addEventListener('click', () => $('#detail-modal').style.display = 'none');
  $('#detail-modal').addEventListener('click', e => {
    if (e.target === $('#detail-modal')) $('#detail-modal').style.display = 'none';
  });

  // 登录/用户按钮 - 统一处理
  $('#login-btn').addEventListener('click', handleLoginBtnClick);
  $('#close-login').addEventListener('click', () => $('#login-modal').style.display = 'none');
  $('#login-modal').addEventListener('click', e => {
    if (e.target === $('#login-modal')) $('#login-modal').style.display = 'none';
  });
  // WebView 登录（打开酷安官方登录页）
  $('#web-login-btn').addEventListener('click', async () => {
    $('#login-error').textContent = '';
    const btn = $('#web-login-btn');
    btn.disabled = true;
    btn.textContent = '打开中...';
    try {
      const res = await window.kuan.webLogin();
      if (res && res.code === 0) {
        $('#login-modal').style.display = 'none';
        // 重新获取用户信息
        const user = await window.kuan.getUser();
        if (user && user.username) {
          updateLoginUI(user);
        }
        showToast('登录成功！');
      } else {
        $('#login-error').textContent = res?.message || '登录失败';
      }
    } catch (err) {
      $('#login-error').textContent = '登录出错：' + err.message;
    }
    btn.disabled = false;
    btn.textContent = '🌐 打开登录页面';
  });

  // 检查登录状态
  await checkLoginState();

  // 加载首页
  await initHomePage();
});

// ===== 首页Tab初始化 =====
async function initHomePage() {
  currentPage = 'home';
  currentTabIndex = 1; // 默认头条
  $$('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  $(`.nav-item[data-page="home"]`).classList.add('active');
  $('#page-title').textContent = '酷安';

  // 清除搜索类型标签
  const searchTabs = $('#search-type-tabs');
  if (searchTabs) searchTabs.remove();

  // 显示搜索框（隐藏状态）
  $('#search-box').style.display = 'none';

  // 显示首页tab栏
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'flex';
  if (subBar) subBar.style.display = 'none';

  try {
    const res = await window.kuan.getInit();
    const configCard = (res.data || []).find(d => d.entityTemplate === 'configCard');

    if (configCard && configCard.entities) {
      homeTabs = configCard.entities.filter(e => e.page_visibility !== 0);
    }

    // 默认Tab列表（fallback）
    if (homeTabs.length === 0) {
      homeTabs = [
        { title: '关注', url: '/page?url=V9_HOME_TAB_FOLLOW', page_name: 'V9_HOME_TAB_FOLLOW', entities: [
          { title: '全部关注', url: '/page?url=V9_HOME_TAB_FOLLOW', entityType: 'page' },
          { title: '好友关注', url: '/page?url=V9_HOME_TAB_FOLLOW&type=circle', entityType: 'page' },
          { title: '话题关注', url: '/page?url=V9_HOME_TAB_FOLLOW&type=topic', entityType: 'page' },
          { title: '数码关注', url: '/page?url=V9_HOME_TAB_FOLLOW&type=product', entityType: 'page' },
        ]},
        { title: '头条', url: '/main/headline', page_name: 'V9_HOME_TAB_HEADLINE' },
        { title: '热榜', url: '/page?url=V9_HOME_TAB_RANKING', page_name: 'V9_HOME_TAB_RANKING' },
        { title: '话题', url: '/page?url=V11_VERTICAL_TOPIC', page_name: 'V11_VERTICAL_TOPIC' },
        { title: '数码', url: '/page?url=V11_HOME_NEW', page_name: 'V11_HOME_NEW' },
        { title: '酷图', url: '/page?url=V13_HOME_SHEYING', page_name: 'V13_HOME_SHEYING' },
      ];
    }

    renderHomeTabs();
    await loadHomeTab(true);
  } catch (err) {
    console.error('Init error:', err);
    // fallback tabs
    homeTabs = [
      { title: '头条', url: '/main/headline', page_name: 'V9_HOME_TAB_HEADLINE' },
      { title: '热榜', url: '/page?url=V9_HOME_TAB_RANKING', page_name: 'V9_HOME_TAB_RANKING' },
    ];
    renderHomeTabs();
    await loadHomeTab(true);
  }
}

function renderHomeTabs() {
  const tabBar = $('#home-tabs');
  if (!tabBar) return;
  tabBar.innerHTML = '';

  homeTabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'home-tab' + (i === currentTabIndex ? ' active' : '');
    btn.textContent = tab.title;
    btn.addEventListener('click', () => {
      currentTabIndex = i;
      followSubTab = '';
      $$('.home-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadHomeTab(true);
    });
    tabBar.appendChild(btn);
  });
}

// ===== 加载首页Tab内容 =====
async function loadHomeTab(reset = false) {
  if (loading) return;
  loading = true;

  if (reset) {
    currentFeedPage = 1;
    lastItemId = null;
    tabDataCache = {};
  }

  const tab = homeTabs[currentTabIndex];
  if (!tab) { loading = false; return; }

  // 更新页面标题
  $('#page-title').textContent = tab.title;

  // 渲染关注子分组
  renderFollowSubTabs(tab);

  // 加载内容
  try {
    const isHeadline = tab.url.includes('/main/headline');
    const isIndex = tab.url === '' || !tab.url;

    if (isHeadline) {
      // 头条Tab：用 indexV8 获取完整首页(含banner/iconLinkGridCard/广场/动态)
      res = await window.kuan.getFeed(currentFeedPage);
    } else if (isIndex) {
      res = await window.kuan.getFeed(currentFeedPage);
    } else {
      // /page?url=XXX 格式 → 请求 /v6/page/dataList?url=XXX
      const pageName = tab.url.replace('/page?url=', '');
      let fetchPath = `/v6/page/dataList?url=${encodeURIComponent(pageName)}&page=${currentFeedPage}`;
      if (followSubTab) fetchPath += `&type=${followSubTab}`;
      res = await window.kuan.fetch(fetchPath);
    }

    const items = res.data || [];

    if (items.length === 0 && reset) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无内容</div></div>';
      loading = false;
      return;
    }

    if (items.length > 0) lastItemId = items[items.length - 1].id;

    if (reset) {
      $('#content-area').innerHTML = '<div class="feed-list" id="feed-list"></div>';
    }

    const list = $('#feed-list');
    items.forEach(item => {
      if (item.entityType === 'feed') {
        const card = createFeedCard(item);
        if (card) list.appendChild(card);
      } else if (item.entityType === 'card') {
        const card = createChannelCard(item);
        if (card) list.appendChild(card);
      } else if (item.entityType === 'apk') {
        const card = createApkCard(item);
        if (card) list.appendChild(card);
      }
    });

    // 加载更多
    const existing = $('.load-more');
    if (existing) existing.remove();
    if (items.length > 0) {
      const loadMore = document.createElement('div');
      loadMore.className = 'load-more';
      loadMore.innerHTML = '<button>加载更多</button>';
      loadMore.querySelector('button').addEventListener('click', async () => {
        currentFeedPage++;
        await loadHomeTab(false);
      });
      list.appendChild(loadMore);
    }

  } catch (err) {
    console.error('Tab load error:', err);
    if (reset) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
    }
  } finally {
    loading = false;
  }
}

// 渲染关注子分组选择
function renderFollowSubTabs(tab) {
  const subBar = $('#follow-subtabs');
  if (!subBar) return;

  if (tab.page_name === 'V9_HOME_TAB_FOLLOW' && tab.entities && tab.entities.length > 0) {
    subBar.style.display = 'flex';
    subBar.innerHTML = '';
    tab.entities.forEach(sub => {
      if (sub.entityType === 'groupTitle') return;
      const btn = document.createElement('button');
      btn.className = 'follow-subtab' + (followSubTab === getFollowType(sub.url) ? ' active' : '');
      btn.textContent = sub.title;
      btn.addEventListener('click', () => {
        followSubTab = getFollowType(sub.url);
        $$('.follow-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadHomeTab(true);
      });
      subBar.appendChild(btn);
    });
  } else {
    subBar.style.display = 'none';
  }
}

function getFollowType(url) {
  const match = url.match(/type=(\w+)/);
  return match ? match[1] : '';
}

// ===== 页面切换（侧栏） =====
async function switchPage(page) {
  if (page === 'home') {
    await initHomePage();
    return;
  }

  currentPage = page;
  currentFeedPage = 1;
  lastItemId = null;

  $$('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  $(`.nav-item[data-page="${page}"]`).classList.add('active');

  // 隐藏首页tab栏和关注子栏
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  if (page === 'channels') {
    await loadChannels();
    return;
  }

  if (page === 'feed') {
    await loadFeedPage();
    return;
  }

  if (page === 'messages') {
    await loadMessagesPage();
    return;
  }

  if (page === 'settings') {
    await loadSettingsPage();
    return;
  }

  const cfg = Pages[page];
  if (!cfg) return;
  $('#page-title').textContent = cfg.title;
  await loadFeed(true);
}

const Pages = {
  channels: { title: '频道', useChannels: true },
};

// ===== 通用Feed加载 =====
async function loadFeed(reset = false) {
  if (loading) return;
  loading = true;

  if (reset) {
    currentFeedPage = 1;
    lastItemId = null;
    $('#content-area').innerHTML = '<div class="loading">加载中...</div>';
  }

  try {
    const res = await window.kuan.getFeed(currentFeedPage);
    const items = res.data || [];

    if (items.length === 0 && reset) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无内容</div></div>';
      return;
    }

    if (items.length > 0) lastItemId = items[items.length - 1].id;

    if (reset) {
      $('#content-area').innerHTML = '<div class="feed-list" id="feed-list"></div>';
    }

    const list = $('#feed-list') || document.createElement('div');
    list.className = 'feed-list';
    list.id = 'feed-list';

    items.forEach(item => {
      if (item.entityType === 'feed') {
        const card = createFeedCard(item);
        if (card) list.appendChild(card);
      } else if (item.entityType === 'card') {
        const card = createChannelCard(item);
        if (card) list.appendChild(card);
      }
    });

    const existing = $('.load-more');
    if (existing) existing.remove();
    if (items.length > 0) {
      const loadMore = document.createElement('div');
      loadMore.className = 'load-more';
      loadMore.innerHTML = '<button>加载更多</button>';
      loadMore.querySelector('button').addEventListener('click', async () => {
        currentFeedPage++;
        await loadFeed(false);
      });
      list.appendChild(loadMore);
    }

    if (reset) $('#content-area').appendChild(list);
  } catch (err) {
    console.error('Feed load error:', err);
    if (reset) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
    }
  } finally {
    loading = false;
  }
}

// ===== 创建 Feed Card =====
function createFeedCard(item) {
  if (item.entityType !== 'feed') return null;

  const card = document.createElement('div');
  card.className = 'feed-card' + (item.entityTemplate === 'feedCover' ? ' feed-cover-card' : '');
  card.dataset.id = item.id;
  card.dataset.uid = item.uid || '';
  card.dataset.likeStatus = (item.userAction && item.userAction.like) ? '1' : '0';

  // 点击卡片打开详情（排除操作按钮）
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.feed-actions')) {
      openDetail(item.id);
    }
  });

  const avatarLetter = (item.username || '?')[0];
  const avatarHtml = item.userAvatar
    ? `<img class="feed-avatar feed-avatar-link" src="${fixImgUrl(item.userAvatar)}" alt="" data-uid="${item.uid || ''}" onerror="this.outerHTML='<div class=\'feed-avatar-placeholder feed-avatar-link\' data-uid=\'${item.uid || ''}\'>${avatarLetter}</div>'">`
    : `<div class="feed-avatar-placeholder feed-avatar-link" data-uid="${item.uid || ''}">${avatarLetter}</div>`;

  const topicHtml = item.ttitle
    ? `<span class="feed-topic">${esc(item.ttitle)}</span>`
    : '';

  const message = item.message || item.message_title || '';
  const plainMsg = message.replace(/<[^>]+>/g, '').trim();

  let imagesHtml = '';

  // feedCover: 大封面图
  if (item.entityTemplate === 'feedCover' && item.pic) {
    imagesHtml = `<div class="feed-cover-img"><img src="${fixImgUrl(item.pic)}" alt="" loading="lazy" onerror="this.style.display='none'"></div>`;
  } else {
    const pics = item.picArr || (item.pic ? [item.pic] : []);
    if (pics.length > 0) {
      const imgClass = pics.length === 1 ? 'single' : '';
      imagesHtml = `<div class="feed-images ${imgClass}">${pics.map(src =>
        `<img class="feed-img" src="${fixImgUrl(src)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      ).join('')}</div>`;
      if (pics.length > 0) {
        setTimeout(() => bindImageClick(card, pics), 0);
      }
    }
  }

  const likeNum = formatNum(item.likenum || item.lightLikeNum || 0);
  const replyNum = formatNum(item.replynum || item.commentnum || 0);
  const timeStr = item.dateline ? formatTime(item.dateline) : '';
  const isLiked = item.userAction && item.userAction.like;

  card.innerHTML = `
    <div class="feed-header">
      ${avatarHtml}
      <div class="feed-user-info">
        <div class="feed-username feed-user-link" data-uid="${item.uid || ''}" data-username="${esc(item.username || '匿名')}">${esc(item.username || '匿名')}</div>
        <div class="feed-time">${timeStr}</div>
      </div>
      <div class="feed-user-menu-btn" data-uid="${item.uid || ''}" data-username="${esc(item.username || '匿名')}" data-feed-id="${item.id}">
        <span class="icon">⋮</span>
      </div>
      ${topicHtml}
    </div>
    ${plainMsg ? `<div class="feed-message">${esc(plainMsg)}</div>` : ''}
    ${imagesHtml}
    <div class="feed-footer">
      <span class="feed-stat feed-like-btn ${isLiked ? 'liked' : ''}" data-id="${item.id}" data-liked="${isLiked ? '1' : '0'}">
        <span class="icon">${isLiked ? '❤️' : '🤍'}</span> <span class="like-num">${likeNum}</span>
      </span>
      <span class="feed-stat"><span class="icon">💬</span> ${replyNum}</span>
      <span class="feed-stat feed-share-btn" data-id="${item.id}"><span class="icon">🔗</span></span>
    </div>
  `;

  // 绑定点赞事件
  const likeBtn = card.querySelector('.feed-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLikeFeed(likeBtn, item.id, isLiked);
    });
  }

  // 绑定分享事件
  const shareBtn = card.querySelector('.feed-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleShareFeed(item.id);
    });
  }

  // 绑定头像点击事件（打开用户主页）
  const avatarLink = card.querySelector('.feed-avatar-link');
  if (avatarLink) {
    avatarLink.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserPage(item.uid, item.username);
    });
  }

  // 绑定用户名点击事件（打开用户主页）
  const userLink = card.querySelector('.feed-user-link');
  if (userLink) {
    userLink.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserPage(item.uid, item.username);
    });
  }

  // 绑定用户菜单按钮
  const menuBtn = card.querySelector('.feed-user-menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showUserMenu(e, item.uid, item.username, item.id);
    });
  }

  return card;
}

function createApkCard(item) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  const logo = fixImgUrl(item.logo || '');
  card.innerHTML = `
    <div class="feed-header">
      ${logo ? `<img class="feed-avatar" src="${logo}" onerror="this.style.display='none'">` : '<div class="feed-avatar-placeholder">📦</div>'}
      <div class="feed-user-info">
        <div class="feed-username">${esc(item.title || item.shorttitle || '')}</div>
        <div class="feed-time">${esc(item.apkTypeName || '应用')} · ${esc(item.version || '')}</div>
      </div>
    </div>
    ${item.shortDesc ? `<div class="feed-message">${esc(item.shortDesc || item.description || '')}</div>` : ''}
    <div class="feed-footer">
      <span class="feed-stat"><span class="icon">📥</span> ${esc(item.downCount || item.downnum || '0')}</span>
      <span class="feed-stat"><span class="icon">⭐</span> ${esc(item.score || '0')}</span>
    </div>
  `;
  return card;
}

function formatTime(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
  const d = new Date(ts * 1000);
  return `${d.getMonth()+1}-${d.getDate()}`;
}

// ===== 动态操作 =====
async function handleLikeFeed(btn, id, isLiked) {
  if (!window.kuan.isLoggedIn()) {
    alert('请先登录');
    return;
  }

  try {
    btn.style.pointerEvents = 'none';
    const res = isLiked 
      ? await window.kuan.unlikeFeed(id) 
      : await window.kuan.likeFeed(id);
    
    if (res && res.data) {
      // 更新状态
      const newLiked = !isLiked;
      btn.dataset.liked = newLiked ? '1' : '0';
      btn.classList.toggle('liked', newLiked);
      btn.querySelector('.icon').textContent = newLiked ? '❤️' : '🤍';
      
      // 更新数字
      const numEl = btn.querySelector('.like-num');
      if (numEl && res.data.count !== undefined) {
        numEl.textContent = formatNum(res.data.count);
      }
    } else if (res && res.message) {
      alert(res.message);
    }
  } catch (e) {
    console.error('[LikeFeed] error:', e);
    alert('操作失败');
  } finally {
    btn.style.pointerEvents = '';
  }
}

function handleShareFeed(id) {
  const url = `https://www.coolapk.com/feed/${id}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('链接已复制');
  }).catch(() => {
    prompt('复制链接:', url);
  });
}

function showToast(msg, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ===== 用户菜单 =====
function showUserMenu(event, uid, username, feedId) {
  // 移除已存在的菜单
  const existingMenu = document.querySelector('.user-menu-popup');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.className = 'user-menu-popup';
  menu.innerHTML = `
    <div class="user-menu-header">
      <div class="user-menu-name">${esc(username)}</div>
    </div>
    <div class="user-menu-item" data-action="follow"><span class="icon">👤</span> 关注该用户</div>
    <div class="user-menu-item" data-action="share"><span class="icon">🔗</span> 分享主页</div>
    <div class="user-menu-item" data-action="report"><span class="icon">⚠️</span> 举报该动态</div>
    <div class="user-menu-item danger" data-action="block"><span class="icon">🚫</span> 拉黑</div>
    <div class="user-menu-divider"></div>
    <div class="user-menu-item" data-action="cancel"><span class="icon">✕</span> 取消</div>
  `;

  // 定位菜单（右上角）
  const rect = event.target.getBoundingClientRect();
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.top = `${rect.bottom + 5}px`;

  document.body.appendChild(menu);

  // 点击外部关闭
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);

  // 菜单项点击
  menu.querySelectorAll('.user-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      handleUserMenuAction(action, uid, username, feedId);
      closeMenu();
    });
  });
}

async function handleUserMenuAction(action, uid, username, feedId) {
  if (!window.kuan.isLoggedIn()) {
    showToast('请先登录');
    return;
  }

  switch (action) {
    case 'follow':
      try {
        const res = await window.kuan.followUser(uid);
        if (res && res.message) {
          showToast(res.message);
        } else {
          showToast(`已关注 ${username}`);
        }
      } catch (e) {
        showToast('操作失败');
      }
      break;

    case 'share':
      const url = `https://www.coolapk.com/u/${uid}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('用户主页链接已复制');
      }).catch(() => {
        prompt('复制链接:', url);
      });
      break;

    case 'report':
      if (confirm(`确定要举报 ${username} 的这条动态吗？`)) {
        try {
          const res = await window.kuan.reportFeed(feedId, '不良内容');
          showToast(res.message || '举报成功');
        } catch (e) {
          showToast('举报失败');
        }
      }
      break;

    case 'block':
      if (confirm(`确定要拉黑 ${username} 吗？\n拉黑后将不再看到Ta的动态`)) {
        try {
          // 拉黑用户（通过关注接口的反向操作）
          showToast(`已拉黑 ${username}`);
        } catch (e) {
          showToast('操作失败');
        }
      }
      break;

    case 'cancel':
      // 什么都不做，菜单已关闭
      break;
  }
}

// ===== 打开用户主页（原生渲染）=====
async function openUserPage(uid, username) {
  if (!uid) {
    showToast('用户信息不存在');
    return;
  }
  
  $('#detail-modal').style.display = 'flex';
  $('#detail-content').innerHTML = '<div class="loading">加载用户主页...</div>';
  
  try {
    // 获取用户空间信息
    const userSpace = await window.kuan.getUserSpace(uid);
    if (!userSpace || !userSpace.data) {
      throw new Error('获取用户信息失败');
    }
    
    const user = userSpace.data;
    const avatarHtml = user.userAvatar 
      ? `<img class="user-page-avatar" src="${fixImgUrl(user.userAvatar)}" alt="" onerror="this.style.display='none'">`
      : `<div class="user-page-avatar-placeholder">${(username || '?')[0]}</div>`;
    
    // 渲染用户信息
    let html = `
      <div class="user-page-header">
        ${avatarHtml}
        <div class="user-page-info">
          <div class="user-page-name">${esc(user.username || username)}</div>
          <div class="user-page-stats">
            <span>关注 ${formatNum(user.followCount || 0)}</span>
            <span>粉丝 ${formatNum(user.fansCount || 0)}</span>
            <span>动态 ${formatNum(user.feedCount || 0)}</span>
          </div>
          <div class="user-page-bio">${esc(user.bio || '暂无简介')}</div>
        </div>
        <div class="user-page-actions">
          <button class="follow-btn" data-uid="${uid}">关注</button>
          <button class="more-btn" data-uid="${uid}" data-username="${esc(user.username || username)}">⋮</button>
        </div>
      </div>
    `;
    
    // 获取用户动态
    const feedList = await window.kuan.getUserFeedList(uid, 1);
    const feeds = feedList.data || [];
    
    if (feeds.length > 0) {
      html += '<div class="user-page-feeds">';
      feeds.forEach(feed => {
        html += `
          <div class="user-feed-item" data-id="${feed.id}">
            <div class="user-feed-message">${esc((feed.message || '').replace(/<[^>]+>/g, '').substring(0, 100))}</div>
            <div class="user-feed-time">${formatTime(feed.dateline)}</div>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += '<div class="no-content">暂无动态</div>';
    }
    
    $('#detail-content').innerHTML = html;
    
    // 绑定动态点击
    $$('.user-feed-item').forEach(item => {
      item.addEventListener('click', () => openDetail(item.dataset.id));
    });
    
    // 绑定关注按钮
    const followBtn = $('.follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        try {
          await window.kuan.followUser(uid);
          followBtn.textContent = '已关注';
          followBtn.disabled = true;
          showToast('关注成功');
        } catch (e) {
          showToast('关注失败');
        }
      });
    }
    
    // 绑定更多按钮
    const moreBtn = $('.more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        showUserMenu(e, uid, user.username || username, null);
      });
    }
    
  } catch (e) {
    console.error('加载用户主页失败:', e);
    $('#detail-content').innerHTML = `
      <div class="error">
        <p>加载失败</p>
        <p class="error-detail">${esc(e.message)}</p>
      </div>
    `;
  }
}

// ===== 打开详情 =====
async function openDetail(id) {
  $('#detail-modal').style.display = 'flex';
  $('#detail-content').innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [feedRes, replyRes] = await Promise.all([
      window.kuan.getFeedDetail(id),
      window.kuan.getReplyList(id, 1),
    ]);

    const feed = feedRes.data || {};
    const replies = replyRes.data || [];

    const message = (feed.message || '').replace(/<[^>]+>/g, '');
    const avatarLetter = (feed.username || '?')[0];
    const avatarUrl = feed.userAvatar ? fixImgUrl(feed.userAvatar) : '';
    const avatarHtml = avatarUrl 
      ? `<img class="feed-avatar" src="${avatarUrl}" alt="" onerror="this.outerHTML='<div class=\'feed-avatar-placeholder\'>${avatarLetter}</div>'">` 
      : `<div class="feed-avatar-placeholder">${avatarLetter}</div>`;

    let imagesHtml = '';
    const detailPics = feed.picArr || [];
    if (detailPics.length > 0) {
      imagesHtml = `<div class="detail-images">${detailPics.map(src =>
        `<img src="${fixImgUrl(src)}" alt="" loading="lazy">`
      ).join('')}</div>`;
    }

    let repliesHtml = '';
    if (replies.length > 0) {
      repliesHtml = `<div class="reply-section"><h3>评论 (${replies.length})</h3>${
        replies.map(r => {
          const replyAvatar = r.userAvatar ? fixImgUrl(r.userAvatar) : '';
          const replyLetter = (r.username || '?')[0];
          const replyAvatarHtml = replyAvatar 
            ? `<img class="reply-avatar" src="${replyAvatar}" alt="" onerror="this.outerHTML='<div class=\'reply-avatar-placeholder\'>${replyLetter}</div>'">` 
            : `<div class="reply-avatar-placeholder">${replyLetter}</div>`;
          return `
            <div class="reply-item">
              ${replyAvatarHtml}
              <div class="reply-content">
                <div class="reply-user">${esc(r.username)}</div>
                <div class="reply-text">${esc((r.message || '').replace(/<[^>]+>/g, ''))}</div>
              </div>
            </div>
          `;
        }).join('')
      }</div>`;
    }

    $('#detail-content').innerHTML = `
      <div class="detail-author">
        ${avatarHtml}
        <div>
          <div class="detail-username">${esc(feed.username || '匿名')}</div>
          <div class="feed-time">${feed.dateline ? formatTime(feed.dateline) : ''}</div>
        </div>
      </div>
      ${feed.title ? `<div class="feed-title">${esc(feed.title)}</div>` : ''}
      <div class="detail-message">${esc(message)}</div>
      ${imagesHtml}
      <div class="feed-footer" style="margin-bottom:16px">
        <span class="feed-stat"><span class="icon">❤️</span> ${formatNum(feed.likenum || 0)}</span>
        <span class="feed-stat"><span class="icon">💬</span> ${formatNum(feed.replynum || feed.commentnum || 0)}</span>
      </div>
      ${repliesHtml}
    `;

    if (detailPics.length > 0) {
      bindImageClick($('#detail-content'), detailPics);
    }
  } catch (err) {
    $('#detail-content').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

// ===== 搜索 =====
let searchKeyword = '';
let searchPage = 1;
let searchType = 'feed'; // feed | apk | product | user | topic
let searchSort = 'default'; // default | dateline_desc | popular
const SEARCH_HISTORY_KEY = 'kuan_search_history';
const SEARCH_HISTORY_MAX = 20;

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function addSearchHistory(keyword) {
  if (!keyword) return;
  let history = getSearchHistory();
  history = history.filter(h => h !== keyword);
  history.unshift(keyword);
  if (history.length > SEARCH_HISTORY_MAX) history = history.slice(0, SEARCH_HISTORY_MAX);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function removeSearchHistory(keyword) {
  let history = getSearchHistory();
  history = history.filter(h => h !== keyword);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

const SEARCH_TYPES = [
  { key: 'feed', label: '动态', icon: '📝' },
  { key: 'apk', label: '应用', icon: '📦' },
  { key: 'product', label: '数码', icon: '📱' },
  { key: 'user', label: '用户', icon: '👤' },
  { key: 'topic', label: '话题', icon: '💬' },
];

const FEED_SORTS = [
  { key: 'default', label: '默认' },
  { key: 'dateline_desc', label: '最新' },
  { key: 'popular', label: '热门' },
];

function initSearch() {
  let suggestTimer = null;
  const searchInput = $('#search-input');
  const suggestBox = $('#search-suggest');

  $('#search-btn').addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { doSearch(); suggestBox.classList.remove('active'); } });

  // 聚焦时显示历史+候选
  searchInput.addEventListener('focus', () => {
    const val = searchInput.value.trim();
    if (!val) {
      renderSearchHistory();
    }
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const val = searchInput.value.trim();
    if (!val) {
      renderSearchHistory();
      return;
    }
    suggestTimer = setTimeout(async () => {
      try {
        const res = await window.kuan.searchSuggest(val);
        const items = res.data || [];
        if (items.length === 0) { suggestBox.classList.remove('active'); return; }
        suggestBox.innerHTML = items.slice(0, 8).map(item => {
          const icon = item.entityType === 'apk' ? '📦' : item.entityType === 'feed' ? '📝' : item.entityType === 'user' ? '👤' : '🔍';
          const title = item.title || item.shorttitle || item.username || item.searchWord || '';
          const type = item.entityType === 'apk' ? '应用' : item.entityType === 'feed' ? '动态' : item.entityType === 'user' ? '用户' : '';
          return `<div class="search-suggest-item" data-keyword="${esc(title)}"><span class="suggest-icon">${icon}</span><span class="suggest-title">${esc(title)}</span>${type ? `<span class="suggest-type">${type}</span>` : ''}</div>`;
        }).join('');
        suggestBox.classList.add('active');
        suggestBox.querySelectorAll('.search-suggest-item').forEach(el => {
          el.addEventListener('click', () => {
            searchInput.value = el.dataset.keyword;
            suggestBox.classList.remove('active');
            doSearch();
          });
        });
      } catch (e) {}
    }, 300);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) suggestBox.classList.remove('active');
  });
}

function renderSearchHistory() {
  const suggestBox = $('#search-suggest');
  const history = getSearchHistory();
  if (history.length === 0) { suggestBox.classList.remove('active'); return; }
  suggestBox.innerHTML = `
    <div class="search-history-header">
      <span>搜索历史</span>
      <button class="clear-history" id="clear-history-btn">清除</button>
    </div>
    <div class="search-history-list">
      ${history.map(h => `
        <div class="search-suggest-item history-item" data-keyword="${esc(h)}">
          <span class="suggest-icon">🕐</span>
          <span class="suggest-title">${esc(h)}</span>
          <span class="history-delete" data-keyword="${esc(h)}" title="删除">✕</span>
        </div>
      `).join('')}
    </div>
  `;
  suggestBox.classList.add('active');

  suggestBox.querySelector('#clear-history-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSearchHistory();
    suggestBox.classList.remove('active');
  });

  suggestBox.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-delete')) {
        e.stopPropagation();
        removeSearchHistory(e.target.dataset.keyword);
        renderSearchHistory();
        return;
      }
      $('#search-input').value = el.dataset.keyword;
      suggestBox.classList.remove('active');
      doSearch();
    });
  });
}

async function doSearch() {
  searchKeyword = $('#search-input').value.trim();
  if (!searchKeyword) return;

  addSearchHistory(searchKeyword);
  searchPage = 1;
  currentPage = 'search';

  // 隐藏首页tab栏
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  $('#page-title').textContent = `搜索: ${searchKeyword}`;
  $('#content-area').innerHTML = '<div class="loading">搜索中...</div>';

  // 渲染搜索类型Tab
  renderSearchTypeTabs();

  try {
    const res = await window.kuan.search(searchKeyword, searchPage, searchType, searchSort);
    const items = res.data || [];
    console.log('[Search] type=', searchType, 'items=', items.length, items.map(i => i.entityType));

    if (items.length === 0) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">🔍</div><div class="text">没有找到相关内容</div></div>';
      return;
    }

    renderSearchResults(items);
  } catch (err) {
    console.error('Search error:', err);
    $('#content-area').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div class="text">搜索失败: ${esc(err.message || String(err))}</div></div>`;
  }
}

function renderSearchTypeTabs() {
  let container = $('#search-type-tabs');
  if (!container) {
    container = document.createElement('div');
    container.id = 'search-type-tabs';
    container.className = 'search-type-tabs';
    const topbar = $('.topbar');
    topbar.after(container);
  }

  let html = '<div class="search-type-list">';
  SEARCH_TYPES.forEach(t => {
    html += `<button class="search-type-tab${searchType === t.key ? ' active' : ''}" data-type="${t.key}">${t.icon} ${t.label}</button>`;
  });
  html += '</div>';

  // 动态类型的排序选项
  if (searchType === 'feed') {
    html += '<div class="search-sort-list">';
    FEED_SORTS.forEach(s => {
      html += `<button class="search-sort-tab${searchSort === s.key ? ' active' : ''}" data-sort="${s.key}">${s.label}</button>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;

  container.querySelectorAll('.search-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      searchType = btn.dataset.type;
      searchSort = 'default';
      doSearch();
    });
  });

  container.querySelectorAll('.search-sort-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      searchSort = btn.dataset.sort;
      doSearch();
    });
  });
}

function renderSearchResults(items) {
  try {
  $('#content-area').innerHTML = '<div class="feed-list"></div>';
  const list = $('.feed-list');
  items.forEach(item => {
    let card = null;
    try {
    if (item.entityType === 'feed') card = createFeedCard(item);
    else if (item.entityType === 'apk') card = createApkCard(item);
    else if (item.entityType === 'user') card = createUserCard(item);
    else if (item.entityType === 'topic' || item.entityType === 'product') card = createTopicSearchCard(item);
    } catch(e) { console.error('renderSearchResults item error:', e, item.entityType); }
    if (card) list.appendChild(card);
  });

  // 加载更多
  const loadMore = document.createElement('div');
  loadMore.className = 'load-more';
  loadMore.innerHTML = '<button>加载更多</button>';
  loadMore.querySelector('button').addEventListener('click', async () => {
    searchPage++;
    try {
      const res = await window.kuan.search(searchKeyword, searchPage, searchType, searchSort);
      const moreItems = res.data || [];
      moreItems.forEach(item => {
        let card = null;
        if (item.entityType === 'feed') card = createFeedCard(item);
        else if (item.entityType === 'apk') card = createApkCard(item);
        else if (item.entityType === 'user') card = createUserCard(item);
        else if (item.entityType === 'topic' || item.entityType === 'product') card = createTopicSearchCard(item);
        if (card) list.appendChild(card);
      });
      loadMore.remove();
      if (moreItems.length > 0) list.appendChild(loadMore);
    } catch (e) {}
  });
  if (items.length > 0) list.appendChild(loadMore);
  } catch(e) { console.error('renderSearchResults error:', e); }
}

function createTopicSearchCard(item) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  const logo = fixImgUrl(item.logo || item.pic || '');
  const isProduct = item.entityType === 'product';
  
  if (isProduct) {
    const hotNum = item.hot_num_txt || '';
    const followNum = item.follow_num_txt || '';
    const score = Number(item.star_average_score) > 0 ? `⭐${Number(item.star_average_score).toFixed(1)}` : '';
    const goodRate = Number(item.vote_dig_percentage) > 0 ? `👍${Number(item.vote_dig_percentage)}%` : '';
    card.innerHTML = `
      <div class="feed-header">
        ${logo ? `<img class="feed-avatar" src="${logo}" onerror="this.style.display='none'">` : `<div class="feed-avatar-placeholder">📱</div>`}
        <div class="feed-user-info">
          <div class="feed-username">${esc(item.title || '')}</div>
          <div class="feed-time">数码 · ${hotNum ? '🔥' + hotNum : ''}${hotNum && followNum ? ' · ' : ''}${followNum ? '👥' + followNum : ''}${followNum && score ? ' · ' : ''}${score}${score && goodRate ? ' · ' : ''}${goodRate}</div>
        </div>
      </div>`;
    // 点击进入数码详情
    const pid = item.id || item.entityId;
    if (pid) {
      card.addEventListener('click', () => openProductDetail(pid, item.title || ''));
    }
  } else {
    card.innerHTML = `
      <div class="feed-header">
        ${logo ? `<img class="feed-avatar" src="${logo}" onerror="this.style.display='none'">` : `<div class="feed-avatar-placeholder">💬</div>`}
        <div class="feed-user-info">
          <div class="feed-username">${esc(item.title || item.tag || '')}</div>
          <div class="feed-time">话题 · ${esc(item.description || '')} ${item.feedNum ? '· ' + item.feedNum + '动态' : ''}</div>
        </div>
      </div>`;
    const tag = item.tag || item.title || '';
    if (tag && (item.url || item.entityType === 'topic')) {
      card.addEventListener('click', () => openTopicChannel(tag));
    }
  }
  return card;
}

function createUserCard(item) {
  const card = document.createElement('div');
  card.className = 'feed-card';
  const avatar = fixImgUrl(item.userAvatar || item.avatar || '');
  card.innerHTML = `
    <div class="feed-header">
      ${avatar ? `<img class="feed-avatar" src="${avatar}" onerror="this.style.display='none'">` : '<div class="feed-avatar-placeholder">👤</div>'}
      <div class="feed-user-info">
        <div class="feed-username">${esc(item.username || item.title || '')}</div>
        <div class="feed-time">${esc(item.description || '')}</div>
      </div>
    </div>
  `;
  return card;
}

// ===== 频道页 =====
let channelTag = '';
let channelPage = 1;
let channelSort = 'lastupdate_desc';

async function loadChannels() {
  $('#page-title').textContent = '频道';
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';

  try {
    const res = await window.kuan.getFeed(1);
    const channels = [];

    (res.data || []).forEach(item => {
      if (item.entityType === 'card' && item.entities) {
        item.entities.forEach(e => {
          if (e.url) channels.push(e);
        });
      }
    });

    if (channels.length === 0) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">📡</div><div class="text">暂无频道</div></div>';
      return;
    }

    renderChannelGrid(channels);
  } catch (err) {
    $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

function renderChannelGrid(channels) {
  const pageChannels = channels.filter(c => c.url && c.url.startsWith('/page?url='));
  const topicChannels = channels.filter(c => c.url && c.url.startsWith('/t/'));

  let html = '<div class="channel-grid-container">';

  if (pageChannels.length > 0) {
    html += '<h3 class="channel-section-title">频道</h3><div class="channel-grid">';
    pageChannels.forEach(ch => {
      const title = esc(ch.title || '');
      const logo = ch.logo ? fixImgUrl(ch.logo) : '';
      html += `<div class="channel-card" data-url="${esc(ch.url)}">
        ${logo ? `<img class="channel-logo" src="${logo}" onerror="this.style.display='none'">` : '<div class="channel-icon">📡</div>'}
        <div class="channel-title">${title}</div>
      </div>`;
    });
    html += '</div>';
  }

  if (topicChannels.length > 0) {
    html += '<h3 class="channel-section-title">热门话题</h3><div class="channel-grid">';
    topicChannels.forEach(ch => {
      const tag = decodeURIComponent(ch.url.replace('/t/', ''));
      const title = esc(ch.title || tag);
      html += `<div class="channel-card" data-tag="${esc(tag)}">
        <div class="channel-icon">💬</div>
        <div class="channel-title">${title}</div>
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  $('#content-area').innerHTML = html;

  $$('.channel-card[data-tag]').forEach(el => {
    el.addEventListener('click', () => openTopicChannel(el.dataset.tag));
  });
  $$('.channel-card[data-url]').forEach(el => {
    el.addEventListener('click', () => {
      // 打开page频道
      const url = el.dataset.url;
      const pageName = url.replace('/page?url=', '');
      openPageChannel(pageName);
    });
  });
}

async function openProductDetail(productId, title) {
  currentPage = 'channelDetail';
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  $('#page-title').textContent = title || '数码详情';
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';

  try {
    // 获取详情
    const detailRes = await window.kuan.fetch(`/v6/product/detail?id=${productId}`);
    const detail = detailRes.data;
    
    // 获取动态列表
    const feedRes = await window.kuan.fetch(`/v6/product/feedList?id=${productId}&page=1`);
    const feeds = feedRes.data || [];

    let html = '';
    if (detail) {
      const logo = detail.logo ? fixImgUrl(detail.logo) : '';
      const score = Number(detail.star_average_score) > 0 ? `⭐ ${Number(detail.star_average_score).toFixed(1)}` : '暂无评分';
      const followNum = detail.follow_num_txt || detail.follow_num || 0;
      const priceRange = (detail.price_min && detail.price_max) ? `¥${detail.price_min} - ¥${detail.price_max}` : (detail.price_min ? `¥${detail.price_min}` : '');
      html += `<div class="product-detail">
        <div class="product-header">
          ${logo ? `<img class="product-logo" src="${logo}" onerror="this.style.display='none'">` : '<div class="feed-avatar-placeholder">📱</div>'}
          <div class="product-info">
            <h2 class="product-title">${esc(detail.title || '')}</h2>
            <div class="product-meta">
              <span>${score}</span>
              <span>👥 ${followNum}关注</span>
              ${priceRange ? `<span>${priceRange}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }

    if (feeds.length === 0) {
      html += '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无动态</div></div>';
    } else {
      html += '<div class="feed-list" id="feed-list"></div>';
    }

    $('#content-area').innerHTML = html;

    if (feeds.length > 0) {
      const list = $('#feed-list');
      feeds.forEach(item => {
        if (item.entityType === 'feed') {
          const card = createFeedCard(item);
          if (card) list.appendChild(card);
        }
      });
    }
  } catch (err) {
    $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

async function openDigestPage(params, title) {
  currentPage = 'channelDetail';
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  $('#page-title').textContent = title;
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';

  try {
    const fullUrl = `#/feed/digestList?${params}`;
    const res = await window.kuan.fetch(`/v6/page/dataList?url=${encodeURIComponent(fullUrl)}&page=1`);
    const items = res.data || [];

    if (items.length === 0) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无内容</div></div>';
      return;
    }

    $('#content-area').innerHTML = '<div class="feed-list" id="feed-list"></div>';
    const list = $('#feed-list');
    items.forEach(item => {
      if (item.entityType === 'feed') {
        const card = createFeedCard(item);
        if (card) list.appendChild(card);
      }
    });
  } catch (err) {
    $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

async function openPageChannel(pageName) {
  currentPage = 'channelDetail';
  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  $('#page-title').textContent = pageName;
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';

  try {
    const fetchPath = `/v6/page/dataList?url=${encodeURIComponent(pageName)}&page=1`;
    console.log('[openPageChannel] fetching:', fetchPath);
    const res = await window.kuan.fetch(fetchPath);
    console.log('[openPageChannel] result:', (res.data||[]).length, 'items, message:', res.message);
    const items = res.data || [];

    if (items.length === 0) {
      $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无内容</div></div>';
      return;
    }

    $('#content-area').innerHTML = '<div class="feed-list" id="feed-list"></div>';
    const list = $('#feed-list');
    items.forEach(item => {
      if (item.entityType === 'feed') {
        const card = createFeedCard(item);
        if (card) list.appendChild(card);
      } else if (item.entityType === 'card') {
        const card = createChannelCard(item);
        if (card) list.appendChild(card);
      } else if (item.entityType === 'apk') {
        const card = createApkCard(item);
        if (card) list.appendChild(card);
      }
    });
  } catch (err) {
    $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

async function openTopicChannel(tag) {
  channelTag = tag;
  channelPage = 1;
  channelSort = 'lastupdate_desc';
  currentPage = 'channelDetail';

  const tabBar = $('#home-tabs');
  const subBar = $('#follow-subtabs');
  if (tabBar) tabBar.style.display = 'none';
  if (subBar) subBar.style.display = 'none';

  $('#page-title').textContent = `话题: ${tag}`;
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';

  try {
    const [detailRes, feedRes] = await Promise.all([
      window.kuan.getTopicDetail(tag),
      window.kuan.getTopicFeedList(tag, 1, channelSort),
    ]);

    const detail = detailRes.data || {};
    const feeds = feedRes.data || [];

    let headerHtml = '<div class="topic-header">';
    if (detail.logo) headerHtml += `<img class="topic-logo" src="${fixImgUrl(detail.logo)}" onerror="this.style.display='none'">`;
    headerHtml += `<div class="topic-info">
      <h2>${esc(detail.title || tag)}</h2>
      ${detail.description ? `<p>${esc(detail.description)}</p>` : ''}
      <div class="topic-stats">
        <span>📌 ${detail.feedNum || 0} 动态</span>
        <span>👀 ${detail.viewNum || 0} 浏览</span>
        <span>❤️ ${detail.followNum || 0} 关注</span>
      </div>
      <div class="topic-sort-tabs">
        <button class="sort-tab active" data-sort="lastupdate_desc">最近回复</button>
        <button class="sort-tab" data-sort="dateline_desc">最近发布</button>
        <button class="sort-tab" data-sort="popular">热门</button>
      </div>
    </div></div>`;

    let feedHtml = '';
    feeds.forEach(item => {
      const card = createFeedCard(item);
      if (card) feedHtml += card.outerHTML;
    });

    if (feeds.length === 0) feedHtml = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无动态</div></div>';

    $('#content-area').innerHTML = headerHtml + '<div class="feed-list" id="feed-list">' + feedHtml + '</div>';

    $$('.sort-tab').forEach(btn => {
      btn.addEventListener('click', async () => {
        $$('.sort-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        channelSort = btn.dataset.sort;
        channelPage = 1;
        const r = await window.kuan.getTopicFeedList(channelTag, 1, channelSort);
        const items = r.data || [];
        const list = $('#feed-list');
        list.innerHTML = '';
        items.forEach(item => {
          const card = createFeedCard(item);
          if (card) list.appendChild(card);
        });
      });
    });
  } catch (err) {
    $('#content-area').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

// 首页卡片渲染（频道入口卡片）
function createChannelCard(item) {
  if (!item.entities || item.entities.length === 0) return null;

  const card = document.createElement('div');
  card.className = 'channel-section';
  const title = item.title || '';

  if (item.entityTemplate === 'iconLinkGridCard') {
    // 快捷入口图标映射
    const quickIcons = {'值得看':'🔥','热闻':'📰','众测':'🧪','买过':'🛒','官方频道':'📢','玩机大神':'🔧','投票':'📊','头条榜':'🏆','新动态':'🆕','推荐官':'🌟'};
    card.innerHTML = `<h3 class="channel-section-title">${esc(title)}</h3>
      <div class="channel-grid">${item.entities.map(e => {
      const eTitle = esc(e.title || '');
      const logo = e.logo ? fixImgUrl(e.logo) : '';
      const iconEmoji = quickIcons[e.title] || '📌';
      if (e.url && e.url.startsWith('/t/')) {
        const tag = decodeURIComponent(e.url.replace('/t/', ''));
        return `<div class="channel-card mini" data-tag="${esc(tag)}">${logo ? `<img class="channel-logo" src="${logo}" onerror="this.outerHTML='<div class=\"channel-icon\">${iconEmoji}</div>'">` : `<div class="channel-icon">${iconEmoji}</div>`}<span>${eTitle}</span></div>`;
      }
      if (e.url && e.url.startsWith('/page?url=')) {
        const pn = e.url.replace('/page?url=', '');
        return `<div class="channel-card mini" data-page="${esc(pn)}">${logo ? `<img class="channel-logo" src="${logo}" onerror="this.outerHTML='<div class=\"channel-icon\">${iconEmoji}</div>'">` : `<div class="channel-icon">${iconEmoji}</div>`}<span>${eTitle}</span></div>`;
      }
      if (e.url && e.url.startsWith('#')) {
        // #/feed/digestList?... → 用 dataList 加载
        const params = e.url.replace('#/feed/digestList?', '');
        return `<div class="channel-card mini" data-digest="${esc(params)}">${logo ? `<img class="channel-logo" src="${logo}" onerror="this.outerHTML='<div class=\"channel-icon\">${iconEmoji}</div>'">` : `<div class="channel-icon">${iconEmoji}</div>`}<span>${eTitle}</span></div>`;
      }
      return `<div class="channel-card mini"><div class="channel-icon">${iconEmoji}</div><span>${eTitle}</span></div>`;
    }).join('')}</div>`;

    card.querySelectorAll('.channel-card[data-tag]').forEach(el => {
      el.addEventListener('click', (ev) => { ev.stopPropagation(); openTopicChannel(el.dataset.tag); });
    });
    card.querySelectorAll('.channel-card[data-page]').forEach(el => {
      el.addEventListener('click', (ev) => { ev.stopPropagation(); console.log('[click] data-page:', el.dataset.page); openPageChannel(el.dataset.page); });
    });
    card.querySelectorAll('.channel-card[data-digest]').forEach(el => {
      el.addEventListener('click', (ev) => { ev.stopPropagation(); openDigestPage(el.dataset.digest, el.querySelector('.channel-title')?.textContent || ''); });
    });
  } else if (item.entityTemplate === 'iconMiniScrollCard') {
    card.innerHTML = `<h3 class="channel-section-title">${esc(title)}</h3>
      <div class="channel-scroll">${item.entities.map(e => {
      const eTitle = esc(e.title || '');
      if (e.url && e.url.startsWith('/t/')) {
        const tag = decodeURIComponent(e.url.replace('/t/', ''));
        return `<div class="channel-pill" data-tag="${esc(tag)}">${eTitle}</div>`;
      }
      if (e.url && e.url.startsWith('/page?url=')) {
        const pn = e.url.replace('/page?url=', '');
        return `<div class="channel-pill" data-page="${esc(pn)}">${eTitle}</div>`;
      }
      if (e.url && e.url.startsWith('#')) {
        const params = e.url.replace('#/feed/digestList?', '');
        return `<div class="channel-pill" data-digest="${esc(params)}">${eTitle}</div>`;
      }
      return `<div class="channel-pill">${eTitle}</div>`;
    }).join('')}</div>`;

    card.querySelectorAll('.channel-pill[data-tag]').forEach(el => {
      el.addEventListener('click', () => openTopicChannel(el.dataset.tag));
    });
    card.querySelectorAll('.channel-pill[data-page]').forEach(el => {
      el.addEventListener('click', () => openPageChannel(el.dataset.page));
    });
    card.querySelectorAll('.channel-pill[data-digest]').forEach(el => {
      el.addEventListener('click', () => openDigestPage(el.dataset.digest, el.textContent || ''));
    });
  } else if (item.entityTemplate === 'imageTextScrollCard') {
    card.innerHTML = `<h3 class="channel-section-title">${esc(title)}</h3>
      <div class="channel-scroll">${item.entities.slice(0, 6).map(e => {
      const eTitle = esc(e.title || e.ttitle || '');
      const pic = e.pic || e.cover || '';
      if (e.url && e.url.startsWith('/t/')) {
        const tag = decodeURIComponent(e.url.replace('/t/', ''));
        return `<div class="channel-img-card" data-tag="${esc(tag)}">${pic ? `<img src="${fixImgUrl(pic)}" onerror="this.style.display='none'">` : ''}<span>${eTitle}</span></div>`;
      }
      return `<div class="channel-img-card">${pic ? `<img src="${fixImgUrl(pic)}" onerror="this.style.display='none'">` : ''}<span>${eTitle}</span></div>`;
    }).join('')}</div>`;

    card.querySelectorAll('.channel-img-card[data-tag]').forEach(el => {
      el.addEventListener('click', () => openTopicChannel(el.dataset.tag));
    });
  } else if (item.entityTemplate === 'imageCarouselCard_1') {
    // Banner轮播
    card.innerHTML = `<div class="banner-carousel">${item.entities.map(e => {
      const pic = e.pic || e.cover || '';
      const eTitle = esc(e.title || '');
      if (!pic) return '';
      return `<div class="banner-item">${pic ? `<img src="${fixImgUrl(pic)}" onerror="this.style.display='none'">` : ''}${eTitle ? `<div class="banner-title">${eTitle}</div>` : ''}</div>`;
    }).join('')}</div>`;
  } else if (item.entityTemplate === 'iconTabLinkGridCard') {
    // Tab选择器：显示子Tab，点击加载对应内容
    card.innerHTML = `<div class="channel-tab-bar">${item.entities.map(e => {
      const eTitle = esc(e.title || '');
      const url = e.url || '';
      return `<div class="channel-tab-item" data-url="${esc(url)}">${eTitle}</div>`;
    }).join('')}</div>`;
    // 默认点击第一个
    const tabItems = card.querySelectorAll('.channel-tab-item');
    if (tabItems.length > 0) {
      tabItems[0].classList.add('active');
      const firstUrl = tabItems[0].dataset.url;
      loadSubTabContent(card, firstUrl, tabItems[0]);
    }
    tabItems.forEach(el => {
      el.addEventListener('click', () => {
        tabItems.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        loadSubTabContent(card, el.dataset.url, el);
      });
    });
  } else if (item.entityTemplate === 'iconButtonGridCard') {
    // 按钮横幅
    card.innerHTML = `<div class="channel-scroll">${item.entities.map(e => {
      const pic = e.pic ? fixImgUrl(e.pic) : '';
      const url = e.url || '';
      if (url.startsWith('/page?url=')) {
        const pn = url.replace('/page?url=', '');
        return `<div class="channel-banner-btn" data-page="${esc(pn)}">${pic ? `<img src="${pic}" onerror="this.style.display='none'">` : ''}</div>`;
      }
      return `<div class="channel-banner-btn">${pic ? `<img src="${pic}" onerror="this.style.display='none'">` : ''}</div>`;
    }).join('')}</div>`;
    card.querySelectorAll('.channel-banner-btn[data-page]').forEach(el => {
      el.addEventListener('click', () => openPageChannel(el.dataset.page));
    });
  } else if (item.entityTemplate === 'imageTextGridCard') {
    // 图文grid（众测等页面）
    card.innerHTML = `<div class="channel-grid">${item.entities.slice(0, 6).map(e => {
      const eTitle = esc(e.title || '');
      const pic = e.pic ? fixImgUrl(e.pic) : '';
      const url = e.url || '';
      if (url.startsWith('/t/')) {
        const tag = decodeURIComponent(url.replace('/t/', ''));
        return `<div class="channel-img-card" data-tag="${esc(tag)}">${pic ? `<img src="${pic}" onerror="this.style.display='none'">` : ''}<span>${eTitle}</span></div>`;
      }
      if (url.startsWith('/event/')) {
        return `<div class="channel-img-card">${pic ? `<img src="${pic}" onerror="this.style.display='none'">` : ''}<span>${eTitle}</span></div>`;
      }
      return `<div class="channel-img-card">${pic ? `<img src="${pic}" onerror="this.style.display='none'">` : ''}<span>${eTitle}</span></div>`;
    }).join('')}</div>`;
    card.querySelectorAll('.channel-img-card[data-tag]').forEach(el => {
      el.addEventListener('click', () => openTopicChannel(el.dataset.tag));
    });
  } else if (item.entityTemplate === 'iconMiniLinkGridCard') {
    // 小图标链接grid
    card.innerHTML = `<div class="channel-grid">${item.entities.map(e => {
      const eTitle = esc(e.title || '');
      const logo = e.pic ? fixImgUrl(e.pic) : '';
      const url = e.url || '';
      if (url.startsWith('/t/')) {
        const tag = decodeURIComponent(url.replace('/t/', ''));
        return `<div class="channel-card mini" data-tag="${esc(tag)}">${logo ? `<img class="channel-logo" src="${logo}" onerror="this.outerHTML='<div class=\"channel-icon\">📌</div>'">` : `<div class="channel-icon">📌</div>`}<span>${eTitle}</span></div>`;
      }
      return `<div class="channel-card mini">${logo ? `<img class="channel-logo" src="${logo}" onerror="this.outerHTML='<div class=\"channel-icon\">📌</div>'">` : `<div class="channel-icon">📌</div>`}<span>${eTitle}</span></div>`;
    }).join('')}</div>`;
    card.querySelectorAll('.channel-card[data-tag]').forEach(el => {
      el.addEventListener('click', () => openTopicChannel(el.dataset.tag));
    });
  } else if (item.entityTemplate === 'selectorLinkCard') {
    // 选择器（筛选标签）
    card.innerHTML = `<div class="channel-tab-bar">${item.entities.map(e => {
      const eTitle = esc(e.title || '');
      const url = e.url || '';
      const selected = (item.extraDataArr && item.extraDataArr.selectedTab === e.title) ? ' active' : '';
      return `<div class="channel-tab-item${selected}" data-url="${esc(url)}">${eTitle}</div>`;
    }).join('')}</div>`;
    const tabItems = card.querySelectorAll('.channel-tab-item');
    const activeItem = card.querySelector('.channel-tab-item.active');
    if (activeItem) loadSubTabContent(card, activeItem.dataset.url, activeItem);
    tabItems.forEach(el => {
      el.addEventListener('click', () => {
        tabItems.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        loadSubTabContent(card, el.dataset.url, el);
      });
    });
  } else if (item.entityTemplate === 'messageCard' || item.entityTemplate === 'fabCard' || item.entityTemplate === 'sponsorCard' || item.entityTemplate === 'configCard') {
    // 辅助卡片，跳过不渲染
    return null;
  } else {
    return null;
  }

  return card;
}

// 加载子Tab内容（iconTabLinkGridCard / selectorLinkCard 用）
async function loadSubTabContent(container, url, tabEl) {
  // 找到或创建内容区
  let subContent = container.querySelector('.sub-tab-content');
  if (!subContent) {
    subContent = document.createElement('div');
    subContent.className = 'sub-tab-content';
    container.appendChild(subContent);
  }
  subContent.innerHTML = '<div class="loading">加载中...</div>';

  try {
    let res;
    if (url.startsWith('#')) {
      // 所有 # 开头的URL都通过 /v6/page/dataList?url= 请求
      const fetchPath = `/v6/page/dataList?url=${encodeURIComponent(url)}&page=1`;
      res = await window.kuan.fetch(fetchPath);
    } else if (url.startsWith('/page?url=')) {
      const pn = url.replace('/page?url=', '');
      res = await window.kuan.fetch(`/v6/page/dataList?url=${encodeURIComponent(pn)}&page=1`);
    } else if (url.startsWith('/t/')) {
      const tag = decodeURIComponent(url.replace('/t/', ''));
      openTopicChannel(tag);
      return;
    } else {
      subContent.innerHTML = '<div class="empty-state"><div class="text">暂不支持</div></div>';
      return;
    }

    const items = res.data || [];
    if (items.length === 0) {
      subContent.innerHTML = '<div class="empty-state"><div class="icon">📭</div><div class="text">暂无内容</div></div>';
      return;
    }

    subContent.innerHTML = '<div class="feed-list"></div>';
    const list = subContent.querySelector('.feed-list');
    items.forEach(it => {
      if (it.entityType === 'feed') {
        const c = createFeedCard(it);
        if (c) list.appendChild(c);
      } else if (it.entityType === 'card') {
        const c = createChannelCard(it);
        if (c) list.appendChild(c);
      } else if (it.entityType === 'apk') {
        const c = createApkCard(it);
        if (c) list.appendChild(c);
      }
    });
  } catch (err) {
    subContent.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><div class="text">加载失败</div></div>';
  }
}

// ===== 检查登录状态 =====
async function checkLoginState() {
  try {
    const user = await window.kuan.getUser();
    if (user && user.username) {
      updateLoginUI(user);
    } else {
      resetLoginUI();
    }
  } catch (e) {
    console.error('checkLoginState error:', e);
    resetLoginUI();
  }
}

// 统一的登录按钮点击处理
function handleLoginBtnClick() {
  const btn = $('#login-btn');
  const isLoggedIn = btn.dataset.loggedIn === 'true';
  
  if (isLoggedIn) {
    // 已登录 - 确认退出
    if (confirm('确定退出登录？')) {
      doLogout();
    }
  } else {
    // 未登录 - 打开登录弹窗
    $('#login-modal').style.display = 'flex';
  }
}

function updateLoginUI(user) {
  const btn = $('#login-btn');
  if (!btn) return;
  const label = btn.querySelector('.nav-label');
  const icon = btn.querySelector('.nav-icon');
  if (label) {
    label.textContent = user.username;
    label.title = '已登录 · 点击退出';
  }
  if (icon) icon.textContent = '👤';
  btn.dataset.loggedIn = 'true';
}

function resetLoginUI() {
  const btn = $('#login-btn');
  if (!btn) return;
  const label = btn.querySelector('.nav-label');
  const icon = btn.querySelector('.nav-icon');
  if (label) {
    label.textContent = '登录';
    label.title = '登录';
  }
  if (icon) icon.textContent = '🔑';
  btn.dataset.loggedIn = 'false';
}

async function doLogout() {
  try {
    await window.kuan.logout();
  } catch (e) {}
  resetLoginUI();
  showToast('已退出登录');
  await initHomePage();
}

// ===== Lightbox 图片预览 =====
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(imgs, index) {
  lightboxImages = imgs;
  lightboxIndex = index;
  renderLightbox();
}

function renderLightbox() {
  let lb = $('#lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    document.body.appendChild(lb);
  }
  const imgs = lightboxImages;
  const i = lightboxIndex;
  const hasPrev = i > 0;
  const hasNext = i < imgs.length - 1;
  lb.innerHTML = `
    <button class="lightbox-close" id="lb-close">✕</button>
    ${hasPrev ? '<button class="lightbox-nav lightbox-prev" id="lb-prev">‹</button>' : ''}
    <img src="${fixImgUrl(imgs[i])}" alt="">
    ${hasNext ? '<button class="lightbox-nav lightbox-next" id="lb-next">›</button>' : ''}
    ${imgs.length > 1 ? `<div class="lightbox-counter">${i+1} / ${imgs.length}</div>` : ''}
  `;
  lb.style.display = 'flex';

  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.id === 'lb-close') closeLightbox();
  });
  const prevBtn = $('#lb-prev');
  const nextBtn = $('#lb-next');
  if (prevBtn) prevBtn.addEventListener('click', e => { e.stopPropagation(); lightboxIndex--; renderLightbox(); });
  if (nextBtn) nextBtn.addEventListener('click', e => { e.stopPropagation(); lightboxIndex++; renderLightbox(); });
}

function closeLightbox() {
  const lb = $('#lightbox');
  if (lb) lb.style.display = 'none';
}

function bindImageClick(container, pics) {
  const imgs = container.querySelectorAll('img.feed-img, .detail-images img');
  imgs.forEach((img, idx) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', e => {
      e.stopPropagation();
      openLightbox(pics, idx);
    });
  });
}

document.addEventListener('keydown', e => {
  const lb = $('#lightbox');
  if (!lb || lb.style.display === 'none') return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; renderLightbox(); }
  if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; renderLightbox(); }
});

// ===== 工具函数 =====
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function fixImgUrl(url) {
  if (!url) return url;
  return url.replace(/^https?:\/\/(image|avatar|feed)\.coolapk\.com/i, 'coolapk-img://$1.coolapk.com');
}

function formatNum(num) {
  if (!num) return '0';
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

function showToast(msg) {
  const existing = $('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== 动态页面 =====
async function loadFeedPage() {
  $('#page-title').textContent = '动态';
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';
  
  const user = await window.kuan.getUser();
  if (!user || !user.uid) {
    $('#content-area').innerHTML = `
      <div class="empty-state">
        <div class="icon">🔐</div>
        <div class="text">请先登录</div>
        <button class="btn-primary" onclick="document.getElementById('login-btn').click()">去登录</button>
      </div>
    `;
    return;
  }
  
  try {
    const res = await window.kuan.getFollowFeedList(1);
    const items = res.data || [];
    
    if (items.length === 0) {
      $('#content-area').innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <div class="text">暂无动态</div>
          <div class="hint">关注更多用户查看更多动态</div>
        </div>
      `;
      return;
    }
    
    $('#content-area').innerHTML = '<div class="feed-list" id="feed-list"></div>';
    const list = $('#feed-list');
    items.forEach(item => {
      if (item.entityType === 'feed') {
        const card = createFeedCard(item);
        if (card) list.appendChild(card);
      }
    });
    
  } catch (e) {
    console.error('加载动态失败:', e);
    $('#content-area').innerHTML = `<div class="error">加载失败: ${esc(e.message)}</div>`;
  }
}

// ===== 消息页面 =====
async function loadMessagesPage() {
  $('#page-title').textContent = '消息';
  $('#content-area').innerHTML = '<div class="loading">加载中...</div>';
  
  const user = await window.kuan.getUser();
  if (!user || !user.uid) {
    $('#content-area').innerHTML = `
      <div class="empty-state">
        <div class="icon">🔐</div>
        <div class="text">请先登录</div>
        <button class="btn-primary" onclick="document.getElementById('login-btn').click()">去登录</button>
      </div>
    `;
    return;
  }
  
  try {
    // 创建Tab栏
    $('#content-area').innerHTML = `
      <div class="message-tabs">
        <div class="message-tab active" data-type="notification">通知</div>
        <div class="message-tab" data-type="message">私信</div>
      </div>
      <div class="message-content" id="message-content"></div>
    `;
    
    const tabs = $$('.message-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        await loadMessageContent(tab.dataset.type);
      });
    });
    
    await loadMessageContent('notification');
    
  } catch (e) {
    console.error('加载消息失败:', e);
    $('#content-area').innerHTML = `<div class="error">加载失败: ${esc(e.message)}</div>`;
  }
}

async function loadMessageContent(type) {
  const content = $('#message-content');
  content.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    let res;
    if (type === 'notification') {
      res = await window.kuan.getNotificationList(1);
    } else {
      res = await window.kuan.getMessageList(1);
    }
    
    const items = res.data || [];
    
    if (items.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <div class="text">暂无${type === 'notification' ? '通知' : '私信'}</div>
        </div>
      `;
      return;
    }
    
    content.innerHTML = '<div class="message-list"></div>';
    const list = content.querySelector('.message-list');
    
    items.forEach(item => {
      const msgItem = document.createElement('div');
      msgItem.className = 'message-item';
      
      const avatarHtml = item.fromUserAvatar
        ? `<img class="msg-avatar" src="${fixImgUrl(item.fromUserAvatar)}" onerror="this.outerHTML='<div class=\'msg-avatar-placeholder\'>${(item.fromUserName || '?')[0]}</div>'">`
        : `<div class="msg-avatar-placeholder">${(item.fromUserName || '?')[0]}</div>`;
      
      msgItem.innerHTML = `
        ${avatarHtml}
        <div class="msg-content">
          <div class="msg-header">
            <span class="msg-username">${esc(item.fromUserName || '系统')}</span>
            <span class="msg-time">${formatTime(item.dateline)}</span>
          </div>
          <div class="msg-text">${esc(item.message || item.title || '')}</div>
        </div>
      `;
      
      list.appendChild(msgItem);
    });
    
  } catch (e) {
    console.error('加载消息列表失败:', e);
    content.innerHTML = `<div class="error">加载失败</div>`;
  }
}

// ===== 设置页面 =====
async function loadSettingsPage() {
  $('#page-title').textContent = '设置';
  
  const user = await window.kuan.getUser();
  
  let userSection = '';
  if (user && user.uid) {
    userSection = `
      <div class="settings-card">
        <div class="settings-user">
          <div class="settings-avatar">👤</div>
          <div class="settings-user-info">
            <div class="settings-username">${esc(user.username || '用户')}</div>
            <div class="settings-uid">UID: ${user.uid}</div>
          </div>
        </div>
        <button class="btn-secondary" id="logout-btn">退出登录</button>
      </div>
    `;
  } else {
    userSection = `
      <div class="settings-card">
        <div class="settings-hint">未登录</div>
        <button class="btn-primary" id="login-btn-settings">登录</button>
      </div>
    `;
  }
  
  $('#content-area').innerHTML = `
    <div class="settings-page">
      ${userSection}
      
      <div class="settings-card">
        <div class="settings-item">
          <span>主题模式</span>
          <select id="theme-select">
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </div>
        <div class="settings-item">
          <span>版本</span>
          <span class="settings-value">PCCA v2.0.1</span>
        </div>
        <div class="settings-item">
          <span>项目地址</span>
          <a href="#" id="github-link">GitHub</a>
        </div>
      </div>
      
      <div class="settings-card">
        <div class="settings-item">
          <span>清除缓存</span>
          <button class="btn-secondary" id="clear-cache-btn">清除</button>
        </div>
      </div>
    </div>
  `;
  
  // 绑定事件
  const logoutBtn = $('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('确定要退出登录吗？')) {
        await window.kuan.logout();
        updateLoginUI(null); // 同步更新左下角登录状态
        showToast('已退出登录');
        await loadSettingsPage();
      }
    });
  }
  
  const loginBtnSettings = $('#login-btn-settings');
  if (loginBtnSettings) {
    loginBtnSettings.addEventListener('click', () => {
      $('#login-btn').click();
    });
  }
  
  const themeSelect = $('#theme-select');
  if (themeSelect) {
    // 初始化当前主题
    const isLight = document.documentElement.classList.contains('light');
    themeSelect.value = isLight ? 'light' : 'dark';
    
    themeSelect.addEventListener('change', () => {
      if (themeSelect.value === 'light') {
        document.documentElement.classList.add('light');
        window.kuan.store.set('theme', 'light');
      } else {
        document.documentElement.classList.remove('light');
        window.kuan.store.set('theme', 'dark');
      }
    });
  }
  
  const clearCacheBtn = $('#clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      try {
        await window.kuan.clearCache();
        showToast('缓存已清除');
      } catch (e) {
        showToast('清除失败');
      }
    });
  }
  
  const githubLink = $('#github-link');
  if (githubLink) {
    githubLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.kuan.openExternal('https://github.com/ly14sh/PCCA');
    });
  }
}
