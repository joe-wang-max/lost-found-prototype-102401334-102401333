/**
 * store.js —— 数据持久化层
 *
 * 使用浏览器 localStorage 保存所有信息，刷新页面后数据依然存在。
 * 首次访问时写入一批示例数据（模拟其他同学发布的信息）。
 * 依赖 core.js（暴露 window.LF）。
 */
(function () {
  'use strict';

  var ITEMS_KEY = 'lf_items';
  var MY_KEY = 'lf_myIds';

  var HOUR = 60 * 60 * 1000;
  var DAY = 24 * HOUR;

  // 生成一批相对当前时间的示例数据
  function buildSeed() {
    var now = Date.now();
    return [
      {
        id: 'seed_1', type: LF.TYPE.FOUND, title: '校园卡', category: '证件卡类',
        location: '教学楼 A 座 3 层', time: now - 2 * HOUR,
        contact: '138****5678', description: '在教学楼三楼楼梯口捡到一张校园卡，学号尾号 3214，请失主联系我。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '李同学'
      },
      {
        id: 'seed_2', type: LF.TYPE.LOST, title: 'AirPods 耳机', category: '电子数码',
        location: '田径场', time: now - 3 * HOUR,
        contact: '159****2333', description: '白色 AirPods（第二代），装在透明壳里，跑步时可能落在看台附近。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '王同学'
      },
      {
        id: 'seed_3', type: LF.TYPE.FOUND, title: '黑色折叠伞', category: '生活用品',
        location: '图书馆 2 楼', time: now - 1 * DAY,
        contact: '186****1090', description: '图书馆二楼自习区捡到一把黑色折叠伞，伞柄有磨损痕迹。',
        image: null, status: LF.STATUS.RESOLVED, publisher: '张同学'
      },
      {
        id: 'seed_4', type: LF.TYPE.FOUND, title: '钥匙一串', category: '生活用品',
        location: '食堂一楼', time: now - 5 * HOUR,
        contact: '137****4411', description: '食堂一楼靠窗座位捡到一串钥匙，共 3 把，带一个蓝色挂件。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '赵同学'
      },
      {
        id: 'seed_5', type: LF.TYPE.LOST, title: '保温杯', category: '生活用品',
        location: '教学楼 B 座', time: now - 8 * HOUR,
        contact: '150****7788', description: '黑色 500ml 保温杯，杯身有白色贴纸，上午上课时可能落在 B203 教室。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '刘同学'
      },
      {
        id: 'seed_6', type: LF.TYPE.FOUND, title: '学生证', category: '证件卡类',
        location: '宿舍区 5 号楼', time: now - 2 * DAY,
        contact: '173****0055', description: '宿舍区 5 号楼门口捡到学生证一张，姓陈，请失主认领。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '陈同学'
      },
      {
        id: 'seed_7', type: LF.TYPE.FOUND, title: '高等数学教材', category: '文具书籍',
        location: '图书馆 3 楼', time: now - 3 * DAY,
        contact: '188****6612', description: '图书馆三楼阅览室捡到一本《高等数学（上）》，封面有笔记。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '周同学'
      },
      {
        id: 'seed_8', type: LF.TYPE.LOST, title: '蓝牙鼠标', category: '电子数码',
        location: '教学楼 C 座', time: now - 4 * DAY,
        contact: '135****9933', description: '罗技灰色无线鼠标，在 C 座机房使用后忘记带走。',
        image: null, status: LF.STATUS.ACTIVE, publisher: '吴同学'
      }
    ];
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function init() {
    if (!localStorage.getItem(ITEMS_KEY)) {
      writeJSON(ITEMS_KEY, buildSeed());
    }
    if (!localStorage.getItem(MY_KEY)) {
      writeJSON(MY_KEY, []);
    }
  }

  var Store = {
    init: init,

    /** 获取全部信息 */
    getAll: function () {
      return readJSON(ITEMS_KEY, []);
    },

    /** 保存全部信息 */
    saveAll: function (items) {
      writeJSON(ITEMS_KEY, items);
    },

    /** 新增一条发布（同时记入「我的发布」） */
    addItem: function (item) {
      var items = readJSON(ITEMS_KEY, []);
      items.unshift(item);
      writeJSON(ITEMS_KEY, items);

      var myIds = readJSON(MY_KEY, []);
      myIds.push(item.id);
      writeJSON(MY_KEY, myIds);
    },

    /** 获取我发布过的信息 */
    getMyItems: function () {
      var myIds = readJSON(MY_KEY, []);
      var items = readJSON(ITEMS_KEY, []);
      return items.filter(function (it) { return myIds.indexOf(it.id) !== -1; });
    },

    /** 更新某条信息 */
    updateItem: function (id, patch) {
      var items = readJSON(ITEMS_KEY, []);
      items = items.map(function (it) {
        if (it.id !== id) return it;
        return Object.assign({}, it, patch);
      });
      writeJSON(ITEMS_KEY, items);
    },

    /** 删除某条信息（同时从「我的发布」移除） */
    removeItem: function (id) {
      var items = readJSON(ITEMS_KEY, []).filter(function (it) { return it.id !== id; });
      writeJSON(ITEMS_KEY, items);
      var myIds = readJSON(MY_KEY, []).filter(function (x) { return x !== id; });
      writeJSON(MY_KEY, myIds);
    },

    /** 清空并重新写入示例数据（供「重置示例数据」使用） */
    reset: function () {
      writeJSON(ITEMS_KEY, buildSeed());
      writeJSON(MY_KEY, []);
    }
  };

  window.Store = Store;
})();
