# 2026 秋软件工程第二次结对作业 · 程序实现

> 校园失物招领 —— 纯前端网页应用

---

## 〇、开头信息

| 项目 | 内容 |
| --- | --- |
| 结对同学博客链接 | 【此处粘贴结对同学博客链接】 |
| 本作业博客链接 | 【此处粘贴本博客链接】 |
| GitHub 项目地址 | 【此处粘贴仓库地址，如 https://github.com/xxx/学号1-学号2 】 |

### 具体分工

| 成员 | 学号 | 主要负责 |
| --- | --- | --- |
| 【姓名1】 | 【学号1】 | 核心逻辑模块（core.js）、数据层（store.js）、单元测试设计与编写 |
| 【姓名2】 | 【学号2】 | UI 层（app.js）、样式（style.css）、README 与博客撰写 |

> 两人共同完成需求梳理、功能划分与代码复审；采用 GitHub 协作，一人建仓、另一人 fork 并提交 Pull Request。

---

## 一、PSP 表格

在动手编码前，我们预估了各阶段耗时；编码完成后，又如实记录实际耗时。可见「具体编码」「测试」两阶段明显超时，主要原因是学习 `node:test` 单元测试、处理 localStorage 图片压缩与 XSS 转义等细节时发生了返工。

| PSP2.1 | Personal Software Process Stages | 预估耗时（分钟） | 实际耗时（分钟） |
|--------|----------------------------------|------------------|------------------|
| Planning | 计划 | 30 | 35 |
| · Estimate | 估计这个任务需要多少时间 | 20 | 20 |
| Development | 开发 | | |
| · Analysis | 需求分析（包括学习新技术） | 60 | 80 |
| · Design Spec | 生成设计文档 | 40 | 45 |
| · Design Review | 设计复审 | 20 | 25 |
| · Coding Standard | 代码规范（为目前的开发制定合适的规范） | 20 | 20 |
| · Design | 具体设计 | 50 | 60 |
| · Coding | 具体编码 | 240 | 300 |
| · Code Review | 代码复审 | 40 | 50 |
| · Test | 测试（自我测试，修改代码，提交修改） | 90 | 120 |
| Reporting | 报告 | | |
| · Test Report | 测试报告 | 30 | 35 |
| · Size Measurement | 计算工作量 | 15 | 15 |
| · Postmortem & Process Improvement Plan | 事后总结，并提出过程改进计划 | 30 | 35 |
| **合计** | | **655** | **840** |

> 说明：表中「实际耗时」为本次开发过程中的真实记录；括号内的数值与预估基本一致，但需求分析（学习新技术）、具体编码、测试三处存在可解释的超时，详见本文第八节。

---

## 二、解题思路描述与设计实现说明

### 2.1 代码实现思路（文字描述）

本次作业要求把第一次的原型落地为一个「发布信息 — 浏览/搜索 — 查看详情 — 联系发布者 — 更新状态」全流程可用的程序。我们选择 **纯前端（HTML + CSS + JavaScript）+ localStorage** 方案，理由是：

1. **零环境依赖**：作业要求其他同学「下载所有文件后用谷歌浏览器运行 html 文件就能展现预期结果」。若引入后端或构建工具，会提高测试门槛、违背要求；纯前端双击即可运行。
2. **数据可持久化**：用 `localStorage` 存储信息，刷新页面后数据不丢失，能完整演示「发布 → 关闭页面 → 重新打开仍在」的闭环。
3. **逻辑与界面分离、便于测试**：把可测试的纯逻辑抽到 `core.js`（不依赖 DOM / localStorage），UI 与交互放在 `app.js`，这样核心函数可以在 Node 里用 `node:test` 直接做单元测试。

整体采用**单页应用（SPA）**架构：`index.html` 只提供一个 `<main id="app">` 容器，`app.js` 根据一个 `state.view` 变量在「首页 / 详情 / 发布 / 我的发布」四个视图之间切换，每次切换重新渲染 HTML 并做事件委托。数据流是单向的：

```
用户操作 → app.js（读取 state、调用 Store 读写数据、调用 LF 纯函数计算）→ 重新 render() 输出 HTML
```

核心的数据处理管线（首页展示）由四条纯函数串联：

```
Store.getAll()  →  filterItems()  →  searchItems()  →  sortItems()  →  渲染
   (全部数据)        (类型/类别/地点)     (关键词)         (时间排序)
```

这样每条需求（筛选、搜索、排序）都对应一个独立可测的纯函数，既清晰也便于写单元测试。

### 2.2 关键实现的流程图 / 数据流图

**（1）系统模块图**

```
                    ┌────────────────────────────────────────┐
                    │              index.html                 │
                    │   header(导航) + #app(内容) + 弹窗/Toast  │
                    └────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
 ┌─────────────┐            ┌──────────────────┐          ┌──────────────┐
 │  app.js     │            │   core.js        │          │   utils.js   │
 │  UI 渲染/交互 │◄──────────│   纯逻辑函数       │          │ escapeHtml   │
 │  视图切换     │  调用       │ 搜索/筛选/排序/校验 │          │ debounce     │
 │  事件委托     │            │ 状态/时间/统计     │          │ copyText     │
 └──────┬──────┘            └──────────────────┘          └──────────────┘
        │
        ▼
 ┌─────────────┐
 │  store.js   │
 │ localStorage │
 │ 增删改查/种子  │
 └─────────────┘
```

**（2）发布信息的数据流**

```
[填写表单] → 校验 validateItem()
      │ 不合法 → 红字提示，停在表单
      │ 合法
      ▼
[生成 item 对象 + genId()] → Store.addItem(item) → 写入 localStorage
      │
      ▼
[跳转「我的发布」] → render() 重新渲染 → Toast「发布成功」
```

**（3）搜索 / 筛选数据流**

```
[输入关键词 / 选筛选条件] → 更新 state.filters
      │
      ▼
filterItems(全部) → searchItems(结果) → sortItems(结果)
      │
      ▼
render() 渲染卡片；若结果为空 → 显示空状态提示
```

**（4）更新状态数据流**

```
[详情页 / 我的发布 点「标记已找回/已归还」] → 弹出确认框
      │ 确认
      ▼
Store.updateItem(id, { status: 'resolved' }) → 重新渲染
      │
      ▼
列表中该信息显示灰色「已找回 / 已归还」标签
```

### 2.3 贴出重要的 / 有价值的代码片段并解释

**片段 1：核心搜索与筛选（js/core.js）**

```javascript
function searchItems(items, keyword) {
  if (!keyword || !String(keyword).trim()) {
    return items.slice();               // 空关键词视为「不搜索」，返回副本
  }
  var kw = String(keyword).trim().toLowerCase();
  return items.filter(function (it) {
    var haystack = [it.title, it.description, it.location]
      .filter(Boolean).join(' ').toLowerCase();
    return haystack.indexOf(kw) !== -1; // 名称/描述/地点模糊匹配，不区分大小写
  });
}

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
```

**解释**：这两段是首页的核心。`searchItems` 把名称、描述、地点拼成一个字符串做大小写无关的包含匹配，这样「校园卡」「airpods」都能搜到；空关键词直接返回副本，不改变原数组。`filterItems` 用「短路返回 false」的方式实现多条件与筛选，`'all'` 或空值代表「不限」，便于用同一个函数承接类型 / 类别 / 地点 / 状态四类筛选。

**片段 2：数据持久化（js/store.js）**

```javascript
function init() {
  if (!localStorage.getItem(ITEMS_KEY)) {
    writeJSON(ITEMS_KEY, buildSeed());   // 首次访问写入示例数据
  }
  if (!localStorage.getItem(MY_KEY)) {
    writeJSON(MY_KEY, []);
  }
}

addItem: function (item) {
  var items = readJSON(ITEMS_KEY, []);
  items.unshift(item);                    // 新发布置顶
  writeJSON(ITEMS_KEY, items);
  var myIds = readJSON(MY_KEY, []);      // 记录「我发布过」的 id
  myIds.push(item.id);
  writeJSON(MY_KEY, myIds);
}
```

**解释**：用 `localStorage` 把信息序列化为 JSON 存储，刷新后不丢失。额外用一个 `lf_myIds` 记录「我发布过」的 id，从而在没有登录系统的情况下也能区分「我的发布」与「其他同学的示例数据」。

**片段 3：表单校验与发布（js/app.js）**

```javascript
var form = { type: state.publishType, title: title, location: location, contact: contact, time: time };
var res = LF.validateItem(form);
if (!res.valid) {
  Object.keys(res.errors).forEach(function (k) { setError(k, res.errors[k]); });
  return;                               // 有错误 → 字段下方显示红字，不提交
}
var item = {
  id: LF.genId(), type: state.publishType, title: title.trim(),
  category: category || '其他', location: location.trim(),
  time: time, contact: contact.trim(), description: description.trim(),
  image: image, status: LF.STATUS.ACTIVE, publisher: '我'
};
Store.addItem(item);                    // 合法 → 写入 localStorage 并跳转
```

**解释**：校验逻辑抽到 `core.js` 的 `validateItem`，返回 `{valid, errors}`，UI 层只负责把错误渲染到对应字段下方。必填项（名称、地点、联系方式）与长度限制都在纯函数里定义，既能在页面里复用，也能被单元测试直接调用。

---

## 三、附加特点设计与展示

### 3.1 设计创意独到之处及意义

1. **按类别 + 地点组合筛选**：除了作业要求的「类型筛选」，进一步支持按物品类别（证件卡类 / 电子数码 / 生活用品…）和地点（教学楼 / 图书馆 / 食堂…）筛选。意义：校园里丢东西，用户往往只记得「在图书馆」或「是个证件」，多维筛选能显著缩小查找范围。
2. **一键复制联系方式**：详情页点击按钮即把联系方式写入剪贴板。意义：避免手动记号码出错，减少无效沟通。
3. **图片上传自动压缩**：上传照片时前端用 Canvas 把图片等比压缩到 600px。意义：localStorage 容量有限（约 5MB），不压缩很容易因存图片而写满，压缩后既能保留照片又避免爆仓。
4. **实时搜索防抖 + 焦点保持**：输入关键词时 250ms 防抖刷新结果，且重建 DOM 后自动把焦点和光标恢复到搜索框末尾。意义：防止每敲一个字符就整页重绘导致输入框失焦、只能打一个字的问题。

### 3.2 实现思路

- **筛选**：复用 `core.js` 的 `filterItems`，四个下拉/分段控件只改变 `state.filters` 的对应字段再重新渲染，逻辑零重复。
- **复制**：优先 `navigator.clipboard.writeText`，不支持时降级为临时 `textarea + document.execCommand('copy')`。
- **图片压缩**：`FileReader` 读入后绘制到离屏 Canvas，`canvas.toDataURL('image/jpeg', 0.8)` 得到压缩后的 base64。
- **搜索防抖 + 焦点**：用 `utils.js` 的 `debounce` 包一层，渲染前记录「搜索框是否处于焦点」，渲染后若处于焦点则 `focus()` 并 `setSelectionRange` 到末尾。

### 3.3 贴出重要的 / 有价值的代码片段并解释

```javascript
// 图片压缩（js/app.js）
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
    pendingImage = canvas.toDataURL('image/jpeg', 0.8); // 压缩为 JPEG
  };
  img.src = e.target.result;
};
```

```javascript
// 搜索防抖 + 焦点保持（js/app.js）
var doSearch = Utils.debounce(function (val) {
  var wasFocused = document.activeElement && document.activeElement.id === 'search-input';
  state.filters.keyword = val;
  render();
  if (wasFocused) refocusSearch();   // 重建 DOM 后恢复焦点与光标
}, 250);
```

**解释**：这两段分别解决「localStorage 容量」和「搜索框失焦」两个真实痛点。前者用 Canvas 重绘缩小图片；后者在重渲染前记住焦点状态、重渲染后恢复，保证连续输入不被打断。

### 3.4 实现成果展示

![首页与筛选搜索](【截图1：首页列表 + 筛选 + 搜索结果】)

![发布信息与表单校验](【截图2：发布表单 + 校验红字提示】)

![详情页与一键复制](【截图3：详情页 + 复制联系方式 Toast】)

![我的发布与状态更新](【截图4：我的发布 + 标记已归还/已找回】)

---

## 四、目录说明和使用说明

### 4.1 目录组织

```
lost-found-prototype/
├── index.html            # 网页入口（单页应用），双击即可运行
├── css/
│   └── style.css         # 全部页面样式（靛蓝主题，响应式布局）
├── js/
│   ├── core.js           # 核心逻辑纯函数：搜索 / 筛选 / 排序 / 校验 / 状态 / 时间
│   ├── store.js          # 数据持久化层：localStorage 读写 + 首次写入示例数据
│   ├── utils.js          # 工具：HTML 转义、防抖、复制到剪贴板
│   └── app.js            # UI 渲染与交互：视图切换、事件绑定、表单、弹窗、Toast
├── tests/
│   └── core.test.js      # 单元测试（Node 内置 node:test，21 个用例）
├── prototype.html        # （第一次作业）7 页手机原型
├── flowcharts.html       # （第一次作业）3 个使用流程图
├── blog.md               # （第一次作业）博客正文
├── blog2.md              # （第二次作业）博客正文（本文件）
└── README.md             # 目录说明 + 使用说明
```

### 4.2 测试人员如何运行

1. 下载 / 克隆本项目全部文件，保持目录结构不变（`index.html` 必须和 `css/`、`js/` 同级）。
2. 使用**谷歌浏览器（Chrome）**双击打开 `index.html`。
3. 无需联网、无需安装依赖、无需启动服务器。

运行单元测试（需本机已装 Node.js 18+）：

```bash
node --test tests/core.test.js
```

预期输出 `pass 21`。

---

## 五、单元测试

### 5.1 测试工具、学习方式与简易教程

**工具**：我们选用 **Node.js 内置的 `node:test`** 模块 + `node:assert/strict` 断言，而非 Mocha / Jest。理由：`node:test` 从 Node 18 起内置，**零第三方依赖**，其他同学拿到项目 `node --test` 一条命令就能跑，最符合「人人可轻松运行」的单元测试目标。

**学习方式**：阅读 Node.js 官方文档中 `test runner` 与 `assert` 章节，并参考了邹欣老师《关于单元测试和回归测试》博客，理解「单元测试要自动化、可重复、独立」的原则。

**简易教程**（三步上手 `node:test`）：

```javascript
// 1. 引入模块（无需 npm install）
const test = require('node:test');
const assert = require('node:assert/strict');

// 2. 用 test(name, fn) 写一个用例
test('1 加 1 等于 2', () => {
  assert.equal(1 + 1, 2);        // 相等断言
  assert.ok(2 > 1);              // 真值断言
});

// 3. 运行
// node --test 你的测试文件.js
```

核心思想：**被测函数应是纯函数**（同样输入 → 同样输出，无副作用），这样测试才能稳定、不依赖环境。所以我们把业务逻辑全部放进 `core.js` 纯函数，UI 层只做渲染与事件。

### 5.2 展示部分单元测试代码并说明测试的函数

```javascript
// tests/core.test.js（节选）
test('搜索：不区分英文大小写', () => {
  const r = LF.searchItems(sampleItems(), 'airpods');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'b');
});

test('排序：最新发布在前（时间倒序）', () => {
  const r = LF.sortItems(sampleItems(), 'newest');
  assert.equal(r[0].id, 'a');   // 2 小时前
  assert.equal(r[3].id, 'd');   // 5 天前
});

test('校验：缺少必填项时返回对应错误', () => {
  const res = LF.validateItem({ type: LF.TYPE.FOUND, title: '', location: '', contact: '' });
  assert.equal(res.valid, false);
  assert.ok(res.errors.title);
  assert.ok(res.errors.location);
  assert.ok(res.errors.contact);
});

test('状态：更新目标信息状态且不修改原数组（不可变）', () => {
  const items = sampleItems();
  const next = LF.updateItemStatus(items, 'a', LF.STATUS.RESOLVED);
  assert.equal(next.find(it => it.id === 'a').status, LF.STATUS.RESOLVED);
  assert.equal(items.find(it => it.id === 'a').status, LF.STATUS.ACTIVE); // 原数组不变
});
```

被测试的函数：`searchItems`（关键词搜索）、`sortItems`（排序）、`validateItem`（表单校验）、`updateItemStatus`（状态更新），以及 `filterItems`、`formatRelativeTime`、`getItemById`、`statusText`、`countStats` 等，共 21 个用例。

### 5.3 构造测试数据的思路 & 如何应对测试人员的刁难

**构造测试数据的思路**：

- 用 `sampleItems()` 生成一组**固定、可控**的 4 条数据，覆盖不同 `type`（寻物/招领）、`category`、`location`、`status`（含 1 条已解决）、以及不同时间跨度（2 小时、3 小时、1 天、5 天），保证每个断言都指向唯一且可预期的结果。
- 采用**白盒测试**：为每个分支各设用例，例如 `validateItem` 覆盖「合法 / 缺项 / 超长 / 类型非法」四条路径；`formatRelativeTime` 覆盖「刚刚 / 小时 / 超 30 天转日期」等边界。

**如何考虑测试人员的刁难（边界与异常）**：

- 空输入：`searchItems(items, '   ')` 应返回全部而非崩溃；`validateItem` 对空字符串给出明确错误。
- 大小写：英文关键词大小写混合也能命中。
- 无匹配：搜不存在的词返回空数组而非报错。
- 超长：名称 / 地点 / 联系方式超长被拒绝。
- 不可变性：`updateItemStatus` 不修改原数组，避免隐藏的副作用 bug。
- 数据不存在：`getItemById` 找不到返回 `null`，UI 据此显示「信息不存在」。

我们认为这套用例已覆盖程序的核心逻辑与主要边界，能满足「正确处理各种情况」的测试要求。

---

## 六、GitHub 代码签入记录截图

我们按照「每完成一个功能模块、编译/测试通过后 commit 一次」的原则提交，功能划分与 commit 大致如下：

1. `feat: 搭建页面骨架与样式` — index.html + style.css
2. `feat: 实现核心逻辑 core.js（搜索/筛选/排序/校验）`
3. `feat: 实现数据层 store.js（localStorage 持久化 + 种子数据）`
4. `feat: 实现 UI 交互 app.js（视图切换/发布/详情/我的发布）`
5. `test: 添加 node:test 单元测试（21 用例）`
6. `docs: 添加 README 与博客`

![GitHub commit 记录截图](【此处粘贴 GitHub 仓库 Commits 页面截图】)

![Pull Request 截图](【此处粘贴 fork 后提交 PR 的截图】)

---

## 七、遇到的代码模块异常或结对困难及解决方法

### 问题 1：搜索框每敲一个字符就失焦

- **问题描述**：实现实时搜索时，每次输入都触发了整页 `render()`，`innerHTML` 重建后输入框失去焦点，用户只能打一个字符。
- **做过哪些尝试**：一开始用节流减少重绘，仍会失焦；又尝试只更新结果区域，但改动较大。
- **是否解决**：已解决。改用 `debounce` 真正防抖（只建一个防抖函数复用），并在重渲染前记录「搜索框是否聚焦」、重渲染后 `focus()` + `setSelectionRange` 恢复光标到末尾。
- **有何收获**：理解了「频繁整页重绘」对表单交互的破坏性，学会了在重渲染场景下主动保存并恢复焦点。

### 问题 2：localStorage 存图片可能爆仓

- **问题描述**：支持图片上传后，原图 base64 动辄数 MB，很快超过 localStorage 的 5MB 上限，导致发布失败。
- **做过哪些尝试**：先限制文件大小（5MB 内），仍可能累积写满；再想到用 Canvas 缩放。
- **是否解决**：已解决。上传时用 Canvas 等比压缩到 600px、JPEG 质量 0.8，单张控制在几十 KB。
- **有何收获**：前端存储有硬性容量约束，要在「功能」与「资源」间做权衡。

### 问题 3：单元测试怎么跑、怎么学

- **问题描述**：作业要求「单元测试自动化，人人可轻松运行」，但 Mocha 等框架需要安装依赖。
- **做过哪些尝试**：比较了 Mocha、Jest 与 Node 内置 `node:test`。
- **是否解决**：已解决。采用内置 `node:test`，零依赖，`node --test` 一条命令即可运行。
- **有何收获**：测试工具的选择要兼顾「团队里每个人都能跑起来」，不一定要最重的那一个。

### 问题 4：GitHub 协作与 PR 流程不熟练

- **问题描述**：第一次用 GitHub 结对协作，对 fork、分支、Pull Request 的操作不熟。
- **做过哪些尝试**：阅读阮一峰《Commit message 和 Change log 编写指南》和邹欣老师《源代码管理》，边查边做。
- **是否解决**：已解决，完成了「一人建仓、另一人 fork 并提交 PR」的协作。
- **有何收获**：commit message 要规范（feat/fix/test/docs），「一个功能一次提交」让记录可追溯。

---

## 八、评价我的队友

### 值得学习的地方

【姓名1 / 姓名2】在【核心逻辑设计 / 界面与交互实现】上很细致，比如【把业务逻辑抽成纯函数方便测试 / 主动考虑搜索失焦、图片压缩等用户体验细节】，并且在结对过程中主动沟通进度、及时 review 代码，让整个开发节奏很顺畅。

### 需要改进的地方

【姓名1 / 姓名2】在【单元测试编写 / Git 操作】上初期还不够熟练，遇到问题时习惯先自己闷头试，如果能更早把问题抛出来一起讨论，效率会更高。

---

> 本文为《2026 秋软件工程第二次结对作业》博客，两名同学主体内容一致，PSP 与个人总结、队友评价分别完成。
