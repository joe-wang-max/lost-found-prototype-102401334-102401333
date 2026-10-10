/**
 * utils.js —— 工具函数（DOM 渲染相关，非纯逻辑）
 */
(function () {
  'use strict';

  var Utils = {
    /**
     * 转义 HTML 特殊字符，防止用户输入被当作 HTML 注入（XSS）。
     * 所有渲染用户输入的地方都应先经过本函数。
     */
    escapeHtml: function (str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /**
     * 防抖：在连续触发时只执行最后一次。
     */
    debounce: function (fn, wait) {
      var timer = null;
      return function () {
        var ctx = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
      };
    },

    /**
     * 复制文本到剪贴板（带降级方案），返回 Promise。
     */
    copyText: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      // 降级：临时 textarea + execCommand
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(ta);
          resolve();
        } catch (e) {
          document.body.removeChild(ta);
          reject(e);
        }
      });
    }
  };

  window.Utils = Utils;
})();
