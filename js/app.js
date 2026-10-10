/**
 * app.js —— UI 渲染与交互层
 *
 * 单页应用：通过 state.view 在「首页 / 详情 / 发布 / 我的发布」间切换。
 * 依赖 core.js（LF）、store.js（Store）、utils.js（Utils）。
 */
(function () {
  'use strict';

  var state = {
    view: 'home',          // home | detail | publish | mine
    detailId: null,
    filters: {
      type: 'all',         // all | lost | found
      category: 'all',
      location: 'all',
      sort: 'newest',      // newest | oldest
      keyword: ''
    },
    mineFilter: 'all',     // all | active | resolved
    publishType: 'lost'    // lost | found
  };

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var modalRoot = document.getElementById('modal-root');

  // 类别 → 缩略图渐变配色
  var CAT_G = {
    '证件卡类': 'g1', '电子数码': 'g6', '生活用品': 'g3',
    '文具书籍': 'g4', '衣物鞋帽': 'g5', '其他': 'g2'
  };
  function gradientFor(category) { return CAT_G[category] || 'g2'; }

  function esc(s) { return Utils.escapeHtml(s); }

  /* ---------------- 通用组件 ---------------- */

  function typeTag(item) {
    if (item.status === LF.STATUS.RESOLVED) {
      return '<span class="tag tag-done">' + esc(LF.statusText(item)) + '</span>';
    }
    return item.type === LF.TYPE.FOUND
      ? '<span class="tag tag-found">招领</span>'
      : '<span class="tag tag-lost">寻物</span>';
  }

  function thumbHtml(item) {
    if (item.image) {
      return '<div class="thumb"><img src="' + item.image + '" alt=""></div>';
    }
    var ch = esc((item.title || '?').slice(0, 1));
    return '<div class="thumb ' + gradientFor(item.category) + '">' + ch + '</div>';
  }

  function selectHtml(options, selected, allLabel) {
    var html = allLabel ? '<option value="all">' + allLabel + '</option>' : '';
    options.forEach(function (o) {
      var sel = o === selected ? ' selected' : '';
      html += '<option value="' + esc(o) + '"' + sel + '>' + esc(o) + '</option>';
    });
    return html;
  }

  /* ---------------- 首页 ---------------- */

  function getFilteredItems() {
    var items = Store.getAll();
    var f = state.filters;
    items = LF.filterItems(items, {
      type: f.type, category: f.category, location: f.location, status: 'all'
    });
    items = LF.searchItems(items, f.keyword);
    items = LF.sortItems(items, f.sort);
    return items;
  }

  function renderHome() {
    var stats = LF.countStats(Store.getAll());
    var items = getFilteredItems();
    var f = state.filters;

    var cards = items.map(function (it) {
      var meta = esc(it.location) + ' · ' + esc(LF.formatRelativeTime(it.time));
      return '' +
        '<div class="item-card" data-action="open-detail" data-id="' + esc(it.id) + '">' +
          thumbHtml(it) +
          '<div class="item-body">' +
            '<div class="item-title">' +
              '<h3>' + esc(it.title) + '</h3>' + typeTag(it) +
            '</div>' +
            '<div class="item-meta">' + meta + '</div>' +
            '<div class="item-desc">' + esc(it.description || '') + '</div>' +
          '</div>' +
          '<div class="chev">›</div>' +
        '</div>';
    }).join('');

    var empty = items.length === 0
      ? '<div class="empty"><div class="empty-ic">🔍</div><p>没有找到相关信息</p><span>试试更换关键词或筛选条件</span></div>'
      : '';

    var resultInfo = f.keyword.trim()
      ? '<div class="result-count">找到 <b>' + items.length + '</b> 条与「' + esc(f.keyword.trim()) + '」相关的信息</div>'
      : '';

    return '' +
      '<section class="hero">' +
        '<h1>让每一件失物，都回到主人身边</h1>' +
        '<p>集中发布 · 快速搜索 · 一键联系 · 状态同步</p>' +
        '<div class="hero-stats">' +
          '<div class="stat"><b>' + stats.total + '</b><span>信息总数</span></div>' +
          '<div class="stat"><b>' + stats.found + '</b><span>招领</span></div>' +
          '<div class="stat"><b>' + stats.lost + '</b><span>寻物</span></div>' +
          '<div class="stat"><b>' + stats.resolved + '</b><span>已解决</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="toolbar">' +
        '<div class="search-box">' +
          '<span class="search-ic"></span>' +
          '<input id="search-input" type="text" placeholder="搜索物品名称、地点或描述…" value="' + esc(f.keyword) + '">' +
          (f.keyword ? '<button class="clear-x" data-action="clear-search">×</button>' : '') +
        '</div>' +
        '<div class="filters">' +
          '<select id="filter-category">' + selectHtml(LF.CATEGORIES, f.category, '全部类别') + '</select>' +
          '<select id="filter-location">' + selectHtml(LF.LOCATIONS, f.location, '全部地点') + '</select>' +
          '<select id="filter-sort">' +
            '<option value="newest"' + (f.sort === 'newest' ? ' selected' : '') + '>最新发布</option>' +
            '<option value="oldest"' + (f.sort === 'oldest' ? ' selected' : '') + '>最早发布</option>' +
          '</select>' +
        '</div>' +
      '</section>' +

      '<div class="seg" id="type-seg">' +
        '<div class="' + (f.type === 'all' ? 'on' : '') + '" data-action="set-type" data-type="all">全部</div>' +
        '<div class="' + (f.type === 'found' ? 'on' : '') + '" data-action="set-type" data-type="found">失物招领</div>' +
        '<div class="' + (f.type === 'lost' ? 'on' : '') + '" data-action="set-type" data-type="lost">寻物启事</div>' +
      '</div>' +

      resultInfo +
      '<div class="grid">' + cards + '</div>' +
      empty;
  }

  /* ---------------- 详情 ---------------- */

  function renderDetail() {
    var item = LF.getItemById(Store.getAll(), state.detailId);
    if (!item) return '<div class="empty"><p>信息不存在或已被删除</p></div>';

    var isMine = Store.getMyItems().some(function (x) { return x.id === item.id; });
    var hero = item.image
      ? '<div class="detail-hero"><img src="' + item.image + '" alt=""></div>'
      : '<div class="detail-hero hero-ph"><span>物品图片</span></div>';

    var actions = '';
    if (isMine && item.status === LF.STATUS.ACTIVE) {
      actions = '<button class="btn btn-ghost" data-action="mark-resolved" data-id="' + esc(item.id) + '">标记为「' +
        (item.type === LF.TYPE.LOST ? '已找回' : '已归还') + '」</button>';
    }
    if (isMine) {
      actions += '<button class="btn btn-danger" data-action="delete-item" data-id="' + esc(item.id) + '">删除这条信息</button>';
    }

    return '' +
      '<div class="page-bar">' +
        '<button class="back" data-action="go-back">‹</button>' +
        '<h2>信息详情</h2>' +
      '</div>' +
      '<div class="detail-card">' +
        hero +
        '<div class="detail-body">' +
          '<div class="detail-title">' +
            '<h3>' + esc(item.title) + '</h3>' + typeTag(item) +
          '</div>' +
          '<div class="info-list">' +
            infoRow('物品类别', item.category) +
            infoRow('信息类型', item.type === LF.TYPE.FOUND ? '失物招领' : '寻物启事') +
            infoRow('相关地点', item.location) +
            infoRow('时间', LF.formatFullTime(item.time)) +
            infoRow('物品描述', item.description || '（未填写）') +
          '</div>' +
          '<div class="publisher">' +
            '<div class="avatar">' + esc((item.publisher || '同').slice(0, 1)) + '</div>' +
            '<div class="pub-info">' +
              '<div class="pub-name">' + esc(item.publisher || '同学') + '</div>' +
              '<div class="pub-contact">' + esc(item.contact) + '</div>' +
            '</div>' +
            '<button class="btn btn-mini" data-action="copy-contact" data-contact="' + esc(item.contact) + '">复制联系方式</button>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" data-action="copy-contact" data-contact="' + esc(item.contact) + '">联系发布者</button>' +
          (actions ? '<div class="detail-actions">' + actions + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  function infoRow(k, v) {
    return '<div class="info-row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  /* ---------------- 发布 ---------------- */

  function renderPublish() {
    return '' +
      '<div class="page-bar">' +
        '<button class="back" data-action="go-back">‹</button>' +
        '<h2>发布信息</h2>' +
      '</div>' +
      '<div class="form-card">' +
        '<div class="type-toggle" id="publish-type">' +
          '<div class="' + (state.publishType === 'lost' ? 'on' : '') + '" data-action="set-publish-type" data-type="lost">寻物启事</div>' +
          '<div class="' + (state.publishType === 'found' ? 'on' : '') + '" data-action="set-publish-type" data-type="found">失物招领</div>' +
        '</div>' +
        '<div class="form">' +
          field('title', '物品名称', '<input id="f-title" type="text" placeholder="如：校园卡、黑色雨伞">') +
          field('category', '物品类别', '<select id="f-category">' + selectHtml(LF.CATEGORIES, '证件卡类', null) + '</select>') +
          field('location', (state.publishType === 'lost' ? '丢失地点' : '拾获地点'), '<input id="f-location" type="text" placeholder="如：教学楼 A 座 3 层">') +
          field('time', (state.publishType === 'lost' ? '丢失时间' : '拾获时间'), '<input id="f-time" type="datetime-local">') +
          field('contact', '联系方式', '<input id="f-contact" type="text" placeholder="手机号 / 微信号">') +
          field('description', '物品描述', '<textarea id="f-desc" rows="4" placeholder="补充物品特征、颜色、品牌等信息"></textarea>') +
          field('image', '物品照片（选填）', '' +
            '<label class="upload" id="upload-box">' +
              '<span class="plus">+</span><span>上传图片</span>' +
              '<input id="f-image" type="file" accept="image/*" hidden>' +
            '</label>' +
            '<img id="upload-preview" class="upload-preview" hidden alt="">' +
            '<div class="err" id="err-image"></div>') +
        '</div>' +
        '<button class="btn btn-primary btn-block" data-action="submit-publish">发 布</button>' +
      '</div>';
  }

  function field(key, label, control) {
    return '<div class="field">' +
      '<label>' + esc(label) + '</label>' +
      control +
      '<div class="err" id="err-' + key + '"></div>' +
    '</div>';
  }

  /* ---------------- 我的发布 ---------------- */

  function renderMine() {
    var all = LF.sortItems(Store.getMyItems(), 'newest');
    var items = LF.filterItems(all, { status: state.mineFilter });

    var cards = items.map(function (it) {
      var statusPill = it.status === LF.STATUS.RESOLVED
        ? '<span class="status-pill done">' + esc(LF.statusText(it)) + '</span>'
        : '<span class="status-pill doing">进行中</span>';
      var btn = it.status === LF.STATUS.ACTIVE
        ? '<button class="btn btn-mini solid" data-action="mark-resolved" data-id="' + esc(it.id) + '">标记' +
          (it.type === LF.TYPE.LOST ? '已找回' : '已归还') + '</button>'
        : '';
      return '' +
        '<div class="my-card">' +
          thumbHtml(it) +
          '<div class="item-body" data-action="open-detail" data-id="' + esc(it.id) + '">' +
            '<div class="item-title"><h3>' + esc(it.title) + '</h3>' + typeTag(it) + '</div>' +
            '<div class="item-meta">发布于 ' + esc(LF.formatRelativeTime(it.time)) + '</div>' +
          '</div>' +
          '<div class="my-actions">' + statusPill + btn +
            '<button class="btn btn-mini danger" data-action="delete-item" data-id="' + esc(it.id) + '">删除</button>' +
          '</div>' +
        '</div>';
    }).join('');

    var empty = items.length === 0
      ? '<div class="empty"><div class="empty-ic">📭</div><p>' +
        (state.mineFilter === 'all' ? '你还没有发布过信息' : '该状态下暂无信息') +
        '</p><button class="btn btn-primary" data-action="go-publish">去发布</button></div>'
      : '';

    return '' +
      '<div class="page-bar">' +
        '<button class="back" data-action="go-home">‹</button>' +
        '<h2>我的发布</h2>' +
      '</div>' +
      '<div class="seg" id="mine-seg">' +
        '<div class="' + (state.mineFilter === 'all' ? 'on' : '') + '" data-action="set-mine-filter" data-filter="all">全部</div>' +
        '<div class="' + (state.mineFilter === 'active' ? 'on' : '') + '" data-action="set-mine-filter" data-filter="active">进行中</div>' +
        '<div class="' + (state.mineFilter === 'resolved' ? 'on' : '') + '" data-action="set-mine-filter" data-filter="resolved">已解决</div>' +
      '</div>' +
      '<div class="mine-list">' + cards + '</div>' +
      empty +
      '<div class="foot-actions"><button class="link" data-action="reset-data">重置示例数据</button></div>';
  }

  /* ---------------- 渲染入口 ---------------- */

  function render() {
    var html = '';
    if (state.view === 'home') html = renderHome();
    else if (state.view === 'detail') html = renderDetail();
    else if (state.view === 'publish') html = renderPublish();
    else if (state.view === 'mine') html = renderMine();
    app.innerHTML = html;

    // 高亮导航
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      var active = (state.view === 'home' && el.dataset.nav === 'home') ||
        (state.view === 'mine' && el.dataset.nav === 'mine');
      el.classList.toggle('active', active);
    });
  }

  /* ---------------- 交互 ---------------- */

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function confirmDialog(title, text, okText) {
    return new Promise(function (resolve) {
      modalRoot.innerHTML = '' +
        '<div class="modal-mask">' +
          '<div class="modal">' +
            '<h3>' + esc(title) + '</h3>' +
            '<p>' + esc(text) + '</p>' +
            '<div class="modal-btns">' +
              '<button class="btn btn-ghost" data-action="modal-cancel">取消</button>' +
              '<button class="btn btn-primary" data-action="modal-ok">' + esc(okText || '确定') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      function close(val) { modalRoot.innerHTML = ''; resolve(val); }
      modalRoot.querySelector('[data-action="modal-ok"]').onclick = function () { close(true); };
      modalRoot.querySelector('[data-action="modal-cancel"]').onclick = function () { close(false); };
      modalRoot.querySelector('.modal-mask').onclick = function (e) {
        if (e.target.classList.contains('modal-mask')) close(false);
      };
    });
  }

  function goBack() {
    if (state.view === 'detail' || state.view === 'publish') state.view = 'home';
    render();
  }

  function openDetail(id) {
    state.detailId = id;
    state.view = 'detail';
    render();
  }

  function clearErrors() {
    document.querySelectorAll('.err').forEach(function (el) { el.textContent = ''; });
  }

  function setError(key, msg) {
    var el = document.getElementById('err-' + key);
    if (el) el.textContent = msg;
  }

  function submitPublish() {
    clearErrors();
    var title = document.getElementById('f-title').value;
    var category = document.getElementById('f-category').value;
    var location = document.getElementById('f-location').value;
    var timeStr = document.getElementById('f-time').value;
    var contact = document.getElementById('f-contact').value;
    var description = document.getElementById('f-desc').value;
    var image = pendingImage || null;

    var time = timeStr ? new Date(timeStr).getTime() : Date.now();

    var form = {
      type: state.publishType, title: title, location: location,
      contact: contact, time: time
    };
    var res = LF.validateItem(form);
    if (!res.valid) {
      Object.keys(res.errors).forEach(function (k) { setError(k, res.errors[k]); });
      return;
    }

    var item = {
      id: LF.genId(), type: state.publishType, title: title.trim(),
      category: category || '其他', location: location.trim(),
      time: time, contact: contact.trim(), description: description.trim(),
      image: image, status: LF.STATUS.ACTIVE, publisher: '我'
    };

    try {
      Store.addItem(item);
    } catch (e) {
      showToast('保存失败：本地存储空间不足，图片可能过大');
      return;
    }

    pendingImage = null;
    showToast('发布成功，等待有缘人联系');
    state.view = 'mine';
    state.mineFilter = 'all';
    render();
  }

  var pendingImage = null;
  function handleImage(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('image', '图片过大，请选择 5MB 以内的图片');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var maxW = 600;
        var scale = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * scale);
        var h = Math.round(img.height * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        pendingImage = dataUrl;
        var preview = document.getElementById('upload-preview');
        preview.src = dataUrl;
        preview.hidden = false;
        setError('image', '');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function copyContact(contact) {
    Utils.copyText(contact).then(function () {
      showToast('联系方式已复制到剪贴板');
    }).catch(function () {
      showToast('复制失败，请手动记录：' + contact);
    });
  }

  function markResolved(id) {
    var item = LF.getItemById(Store.getAll(), id);
    if (!item) return;
    var label = item.type === LF.TYPE.LOST ? '已找回' : '已归还';
    confirmDialog('确认操作', '确认将「' + item.title + '」标记为「' + label + '」吗？标记后其他同学将看到该信息已解决。', '确认标记')
      .then(function (ok) {
        if (!ok) return;
        Store.updateItem(id, { status: LF.STATUS.RESOLVED });
        showToast('已标记为「' + label + '」');
        render();
      });
  }

  function deleteItem(id) {
    confirmDialog('删除信息', '确定要删除这条信息吗？删除后不可恢复。', '删除')
      .then(function (ok) {
        if (!ok) return;
        Store.removeItem(id);
        showToast('已删除');
        if (state.view === 'detail') state.view = 'mine';
        render();
      });
  }

  function resetData() {
    confirmDialog('重置数据', '将清空你发布的信息，并恢复初始示例数据，确定吗？', '重置')
      .then(function (ok) {
        if (!ok) return;
        Store.reset();
        showToast('示例数据已恢复');
        state.view = 'home';
        render();
      });
  }

  /* ---------------- 事件绑定 ---------------- */

  function refocusSearch() {
    var el = document.getElementById('search-input');
    if (el) {
      el.focus();
      var len = el.value.length;
      try { el.setSelectionRange(len, len); } catch (err) { /* 某些输入类型不支持 */ }
    }
  }

  function bindEvents() {
    // 搜索输入：真正防抖，且重建 DOM 后保持焦点
    var doSearch = Utils.debounce(function (val) {
      var wasFocused = document.activeElement && document.activeElement.id === 'search-input';
      state.filters.keyword = val;
      render();
      if (wasFocused) refocusSearch();
    }, 250);

    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.dataset.action;

      if (action === 'go-home') { state.view = 'home'; state.filters.keyword = ''; state.filters.type = 'all'; render(); }
      else if (action === 'go-publish') { state.view = 'publish'; pendingImage = null; render(); }
      else if (action === 'go-mine') { state.view = 'mine'; state.mineFilter = 'all'; render(); }
      else if (action === 'go-back') goBack();
      else if (action === 'open-detail') openDetail(target.dataset.id);
      else if (action === 'set-type') { state.filters.type = target.dataset.type; render(); }
      else if (action === 'set-mine-filter') { state.mineFilter = target.dataset.filter; render(); }
      else if (action === 'set-publish-type') { state.publishType = target.dataset.type; render(); }
      else if (action === 'clear-search') { state.filters.keyword = ''; render(); }
      else if (action === 'copy-contact') copyContact(target.dataset.contact);
      else if (action === 'mark-resolved') markResolved(target.dataset.id);
      else if (action === 'delete-item') deleteItem(target.dataset.id);
      else if (action === 'submit-publish') submitPublish();
      else if (action === 'reset-data') resetData();
    });

    // 搜索输入（防抖）
    app.addEventListener('input', function (e) {
      if (e.target.id === 'search-input') {
        doSearch(e.target.value);
      }
    });

    // 下拉筛选
    app.addEventListener('change', function (e) {
      if (e.target.id === 'filter-category') { state.filters.category = e.target.value; render(); }
      else if (e.target.id === 'filter-location') { state.filters.location = e.target.value; render(); }
      else if (e.target.id === 'filter-sort') { state.filters.sort = e.target.value; render(); }
      else if (e.target.id === 'f-image') { handleImage(e.target.files[0]); }
    });
  }

  function init() {
    Store.init();
    bindEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
