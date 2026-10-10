/**
 * core.js —— 校园失物招领「核心逻辑」纯函数模块
 *
 * 本模块只包含不依赖 DOM、不依赖 localStorage 的纯函数，
 * 便于在浏览器与 Node 单元测试中同时复用（UMD 写法）。
 * 所有函数不修改传入的数组，而是返回新的结果。
 */
(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.LF = global.LF || {};
    Object.assign(global.LF, factory());
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 信息类型
  var TYPE = {
    LOST: 'lost',   // 寻物启事
    FOUND: 'found'  // 失物招领
  };

  // 物品类别（与筛选下拉保持一致）
  var CATEGORIES = ['证件卡类', '电子数码', '生活用品', '文具书籍', '衣物鞋帽', '其他'];

  // 常见地点（与筛选下拉保持一致）
  var LOCATIONS = ['教学楼', '图书馆', '食堂', '宿舍区', '田径场', '其他'];

  // 状态
  var STATUS = {
    ACTIVE: 'active',     // 进行中
    RESOLVED: 'resolved'  // 已找回 / 已归还
  };

  /**
   * 生成唯一 id（时间戳 + 随机串）
   */
  function genId() {
    return 'lf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 关键词搜索：在物品名称、描述、地点中做不区分大小写的模糊匹配。
   * keyword 为空或纯空白时返回原数组的拷贝（视为「不搜索」）。
   */
  function searchItems(items, keyword) {
    if (!keyword || !String(keyword).trim()) {
      return items.slice();
    }
    var kw = String(keyword).trim().toLowerCase();
    return items.filter(function (it) {
      var haystack = [it.title, it.description, it.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(kw) !== -1;
    });
  }

  /**
   * 组合筛选：type 信息类型、category 类别、location 地点、status 状态。
   * 筛选值为空字符串 / 'all' 时表示「不限」。
   */
  function filterItems(items, filters) {
    var f = filters || {};
    return items.filter(function (it) {
      if (f.type && f.type !== 'all' && it.type !== f.type) return false;
      if (f.category && f.category !== 'all' && it.category !== f.category) return false;
      if (f.location && f.location !== 'all' && it.location !== f.location) return false;
      if (f.status && f.status !== 'all' && it.status !== f.status) return false;
      return true;
    });
  }

  /**
   * 排序：newest 按发布时间倒序（默认），oldest 按发布时间正序。
   */
  function sortItems(items, sortBy) {
    var arr = items.slice();
    if (sortBy === 'oldest') {
      arr.sort(function (a, b) { return a.time - b.time; });
    } else {
      arr.sort(function (a, b) { return b.time - a.time; });
    }
    return arr;
  }

  /**
   * 把时间戳格式化为相对时间文案。
   * @param {number} ts  毫秒时间戳
   * @param {number} now 当前时间戳（用于测试注入）
   */
  function formatRelativeTime(ts, now) {
    var cur = now || Date.now();
    var diff = cur - ts;
    var minute = 60 * 1000;
    var hour = 60 * minute;
    var day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 2 * day) return '昨天';
    if (diff < 30 * day) return Math.floor(diff / day) + ' 天前';

    var d = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /**
   * 时间戳格式化为完整日期时间（用于详情页展示）。
   */
  function formatFullTime(ts) {
    var d = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /**
   * 表单校验。返回 { valid, errors }，errors 为 { 字段: 提示 }。
   */
  function validateItem(form) {
    var errors = {};
    var f = form || {};

    if (f.type !== TYPE.LOST && f.type !== TYPE.FOUND) {
      errors.type = '请选择信息类型';
    }
    var title = (f.title || '').trim();
    if (!title) {
      errors.title = '请填写物品名称';
    } else if (title.length > 30) {
      errors.title = '物品名称不能超过 30 个字';
    }
    var location = (f.location || '').trim();
    if (!location) {
      errors.location = '请填写丢失 / 拾获地点';
    } else if (location.length > 40) {
      errors.location = '地点不能超过 40 个字';
    }
    var contact = (f.contact || '').trim();
    if (!contact) {
      errors.contact = '请填写联系方式，方便他人联系你';
    } else if (contact.length > 50) {
      errors.contact = '联系方式不能超过 50 个字';
    }
    if (f.time != null && isNaN(Number(f.time))) {
      errors.time = '时间格式不正确';
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  /**
   * 更新某条信息的状态，返回新的数组（不修改原数组）。
   */
  function updateItemStatus(items, id, status) {
    return items.map(function (it) {
      if (it.id !== id) return it;
      return Object.assign({}, it, { status: status });
    });
  }

  /**
   * 根据 id 查找信息，找不到返回 null。
   */
  function getItemById(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  /**
   * 信息的状态文案：寻物→「已找回」，招领→「已归还」。
   */
  function statusText(item) {
    if (!item) return '';
    if (item.status === STATUS.RESOLVED) {
      return item.type === TYPE.LOST ? '已找回' : '已归还';
    }
    return '进行中';
  }

  /**
   * 统计概览：总数、寻物数、招领数、进行中数、已解决数。
   */
  function countStats(items) {
    var stats = { total: items.length, lost: 0, found: 0, active: 0, resolved: 0 };
    items.forEach(function (it) {
      if (it.type === TYPE.LOST) stats.lost++;
      else stats.found++;
      if (it.status === STATUS.RESOLVED) stats.resolved++;
      else stats.active++;
    });
    return stats;
  }

  return {
    TYPE: TYPE,
    CATEGORIES: CATEGORIES,
    LOCATIONS: LOCATIONS,
    STATUS: STATUS,
    genId: genId,
    searchItems: searchItems,
    filterItems: filterItems,
    sortItems: sortItems,
    formatRelativeTime: formatRelativeTime,
    formatFullTime: formatFullTime,
    validateItem: validateItem,
    updateItemStatus: updateItemStatus,
    getItemById: getItemById,
    statusText: statusText,
    countStats: countStats
  };
});
