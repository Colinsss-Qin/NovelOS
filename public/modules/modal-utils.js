/* ================================================================
   NovelOS Modal Utils — 统一 Modal 组件
   替代浏览器原生 prompt() 和 confirm()
   暴露 window.NovelOSModal { prompt, confirm }
   ================================================================ */

var NovelOSModal = (function () {
  "use strict";

  var currentOverlay = null;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function close() {
    if (currentOverlay) {
      document.body.removeChild(currentOverlay);
      currentOverlay = null;
    }
  }

  function createOverlay() {
    close();
    var overlay = document.createElement("div");
    overlay.className = "novelos-modal-overlay";
    document.body.appendChild(overlay);
    currentOverlay = overlay;
    return overlay;
  }

  /**
   * 输入型 Modal — 替代 window.prompt()
   * @param {string} title    — 弹窗标题
   * @param {string} placeholder — 输入框占位文本
   * @param {string} defaultValue — 默认值
   * @returns {Promise<string|null>}
   */
  function prompt(title, placeholder, defaultValue) {
    return new Promise(function (resolve) {
      var overlay = createOverlay();

      overlay.innerHTML =
        '<div class="novelos-modal">' +
        '<div class="novelos-modal-title">' + esc(title) + "</div>" +
        '<div class="novelos-modal-body">' +
        '<input type="text" class="novelos-modal-input" id="novelos-modal-input" placeholder="' +
        esc(placeholder || "") +
        '" value="' +
        esc(defaultValue || "") +
        '">' +
        "</div>" +
        '<div class="novelos-modal-footer">' +
        '<button class="novelos-modal-btn novelos-modal-btn-cancel" id="novelos-modal-cancel">取消</button>' +
        '<button class="novelos-modal-btn novelos-modal-btn-primary" id="novelos-modal-confirm">确定</button>' +
        "</div>" +
        "</div>";

      var input = document.getElementById("novelos-modal-input");

      function doResolve(value) {
        close();
        resolve(value);
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) doResolve(null);
      });

      overlay.querySelector("#novelos-modal-cancel").addEventListener("click", function () {
        doResolve(null);
      });

      overlay.querySelector("#novelos-modal-confirm").addEventListener("click", function () {
        doResolve(input ? input.value : null);
      });

      overlay.addEventListener("keydown", function (e) {
        if (e.key === "Escape") doResolve(null);
        if (e.key === "Enter") doResolve(input ? input.value : null);
      });

      setTimeout(function () {
        if (input) {
          input.focus();
          if (defaultValue) input.select();
        }
      }, 80);
    });
  }

  /**
   * 确认型 Modal — 替代 window.confirm()
   * @param {string} title   — 弹窗标题
   * @param {string} message — 确认消息
   * @returns {Promise<boolean>}
   */
  function confirm(title, message) {
    return new Promise(function (resolve) {
      var overlay = createOverlay();

      overlay.innerHTML =
        '<div class="novelos-modal">' +
        '<div class="novelos-modal-title">' + esc(title) + "</div>" +
        '<div class="novelos-modal-body">' +
        '<p class="novelos-modal-message">' + esc(message) + "</p>" +
        "</div>" +
        '<div class="novelos-modal-footer">' +
        '<button class="novelos-modal-btn novelos-modal-btn-cancel" id="novelos-modal-cancel">取消</button>' +
        '<button class="novelos-modal-btn novelos-modal-btn-primary" id="novelos-modal-confirm">确定</button>' +
        "</div>" +
        "</div>";

      function doResolve(value) {
        close();
        resolve(value);
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) doResolve(false);
      });

      overlay.querySelector("#novelos-modal-cancel").addEventListener("click", function () {
        doResolve(false);
      });

      overlay.querySelector("#novelos-modal-confirm").addEventListener("click", function () {
        doResolve(true);
      });

      overlay.addEventListener("keydown", function (e) {
        if (e.key === "Escape") doResolve(false);
        if (e.key === "Enter") doResolve(true);
      });

      setTimeout(function () {
        var confirmBtn = document.getElementById("novelos-modal-confirm");
        if (confirmBtn) confirmBtn.focus();
      }, 80);
    });
  }

  return {
    prompt: prompt,
    confirm: confirm,
  };
})();
