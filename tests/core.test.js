/**
 * core.test.js —— 校园失物招领核心逻辑单元测试
 *
 * 运行方式（无需安装任何依赖，使用 Node 内置的 node:test）：
 *   node --test tests/core.test.js
 * 或直接：
 *   node tests/core.test.js
 *
 * 测试方法说明：
 *  - 采用「白盒测试」思路，针对 core.js 中的每个纯函数设计用例；
 *  - 同时覆盖正常路径与边界/异常情况（空输入、大小写、超长、无匹配等）。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const LF = require('../js/core.js');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.now();

// 构造一组固定的测试数据
function sampleItems() {
  return [
    {
      id: 'a', type: LF.TYPE.FOUND, title: '校园卡', category: '证件卡类',
      location: '教学楼', time: NOW - 2 * HOUR,
      contact: '138****5678', description: '学号尾号 3214',
      image: null, status: LF.STATUS.ACTIVE, publisher: '李同学'
    },
    {
      id: 'b', type: LF.TYPE.LOST, title: 'AirPods 耳机', category: '电子数码',
      location: '田径场', time: NOW - 3 * HOUR,
      contact: '159****2333', description: '白色第二代',
      image: null, status: LF.STATUS.ACTIVE, publisher: '王同学'
    },
    {
      id: 'c', type: LF.TYPE.FOUND, title: '黑色折叠伞', category: '生活用品',
      location: '图书馆', time: NOW - 1 * DAY,
      contact: '186****1090', description: '伞柄有磨损',
      image: null, status: LF.STATUS.RESOLVED, publisher: '张同学'
    },
    {
      id: 'd', type: LF.TYPE.LOST, title: '蓝牙鼠标', category: '电子数码',
      location: '宿舍区', time: NOW - 5 * DAY,
      contact: '135****9933', description: '罗技灰色无线',
      image: null, status: LF.STATUS.ACTIVE, publisher: '吴同学'
    }
  ];
}

/* ================= 搜索 searchItems ================= */

test('搜索：按物品名称精确匹配', () => {
  const r = LF.searchItems(sampleItems(), '校园卡');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'a');
});

test('搜索：关键词命中描述也能匹配', () => {
  const r = LF.searchItems(sampleItems(), '罗技');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'd');
});

test('搜索：不区分英文大小写', () => {
  const r = LF.searchItems(sampleItems(), 'airpods');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'b');
});

test('搜索：空关键词返回全部（不搜索）', () => {
  const r = LF.searchItems(sampleItems(), '   ');
  assert.equal(r.length, 4);
});

test('搜索：无匹配结果返回空数组', () => {
  const r = LF.searchItems(sampleItems(), '不存在的物品XYZ');
  assert.equal(r.length, 0);
});

/* ================= 筛选 filterItems ================= */

test('筛选：按信息类型筛选（寻物）', () => {
  const r = LF.filterItems(sampleItems(), { type: LF.TYPE.LOST });
  assert.equal(r.length, 2);
  assert.ok(r.every(it => it.type === LF.TYPE.LOST));
});

test('筛选：按类别 + 地点组合筛选', () => {
  const r = LF.filterItems(sampleItems(), { category: '电子数码', location: '田径场' });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'b');
});

test('筛选：按状态筛选（已解决）', () => {
  const r = LF.filterItems(sampleItems(), { status: LF.STATUS.RESOLVED });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'c');
});

/* ================= 排序 sortItems ================= */

test('排序：最新发布在前（时间倒序）', () => {
  const r = LF.sortItems(sampleItems(), 'newest');
  assert.equal(r[0].id, 'a');   // 2 小时前
  assert.equal(r[3].id, 'd');   // 5 天前
});

test('排序：最早发布在前（时间正序）', () => {
  const r = LF.sortItems(sampleItems(), 'oldest');
  assert.equal(r[0].id, 'd');
  assert.equal(r[3].id, 'a');
});

/* ================= 相对时间 formatRelativeTime ================= */

test('时间：1 分钟内显示「刚刚」', () => {
  assert.equal(LF.formatRelativeTime(NOW - 30 * 1000, NOW), '刚刚');
});

test('时间：按小时显示', () => {
  assert.equal(LF.formatRelativeTime(NOW - 3 * HOUR, NOW), '3 小时前');
});

test('时间：超过 30 天显示完整日期', () => {
  const ts = new Date('2026-01-15 10:00:00').getTime();
  assert.equal(LF.formatRelativeTime(ts, new Date('2026-09-01 10:00:00').getTime()), '2026-01-15');
});

/* ================= 表单校验 validateItem ================= */

test('校验：合法表单通过', () => {
  const res = LF.validateItem({
    type: LF.TYPE.LOST, title: '校园卡', location: '教学楼', contact: '13800001111', time: NOW
  });
  assert.equal(res.valid, true);
  assert.equal(Object.keys(res.errors).length, 0);
});

test('校验：缺少必填项时返回对应错误', () => {
  const res = LF.validateItem({ type: LF.TYPE.FOUND, title: '', location: '', contact: '' });
  assert.equal(res.valid, false);
  assert.ok(res.errors.title);
  assert.ok(res.errors.location);
  assert.ok(res.errors.contact);
});

test('校验：物品名称超长被拒绝', () => {
  const longTitle = '很长的物品名称'.repeat(10); // 70 字
  const res = LF.validateItem({
    type: LF.TYPE.FOUND, title: longTitle, location: '图书馆', contact: '13800001111'
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.title);
});

test('校验：信息类型非法被拒绝', () => {
  const res = LF.validateItem({
    type: 'unknown', title: '校园卡', location: '教学楼', contact: '13800001111'
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.type);
});

/* ================= 状态更新 updateItemStatus ================= */

test('状态：更新目标信息状态且不修改原数组（不可变）', () => {
  const items = sampleItems();
  const next = LF.updateItemStatus(items, 'a', LF.STATUS.RESOLVED);
  assert.equal(next.find(it => it.id === 'a').status, LF.STATUS.RESOLVED);
  assert.equal(items.find(it => it.id === 'a').status, LF.STATUS.ACTIVE); // 原数组不变
  assert.equal(next.find(it => it.id === 'b').status, LF.STATUS.ACTIVE);
});

/* ================= 查找 getItemById ================= */

test('查找：按 id 找到信息 / 找不到返回 null', () => {
  assert.equal(LF.getItemById(sampleItems(), 'c').title, '黑色折叠伞');
  assert.equal(LF.getItemById(sampleItems(), 'not-exist'), null);
});

/* ================= 状态文案 statusText ================= */

test('状态文案：寻物→已找回，招领→已归还', () => {
  const lost = { id: 'x', type: LF.TYPE.LOST, status: LF.STATUS.RESOLVED };
  const found = { id: 'y', type: LF.TYPE.FOUND, status: LF.STATUS.RESOLVED };
  assert.equal(LF.statusText(lost), '已找回');
  assert.equal(LF.statusText(found), '已归还');
  assert.equal(LF.statusText({ id: 'z', type: LF.TYPE.LOST, status: LF.STATUS.ACTIVE }), '进行中');
});

/* ================= 统计 countStats ================= */

test('统计：总数 / 寻物 / 招领 / 进行中 / 已解决 计数正确', () => {
  const s = LF.countStats(sampleItems());
  assert.equal(s.total, 4);
  assert.equal(s.lost, 2);
  assert.equal(s.found, 2);
  assert.equal(s.active, 3);
  assert.equal(s.resolved, 1);
});
