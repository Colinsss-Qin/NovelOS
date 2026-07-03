/* DeleteConfirm — confirmation dialog before deletion */
var DeleteConfirm = {
  el: null,
  onConfirm: null,

  init: function () {
    // Create modal overlay
    var overlay = document.createElement("div");
    overlay.className = "sb-overlay";
    overlay.style.display = "none";
    overlay.innerHTML =
      '<div class="sb-confirm">' +
      '<h3>⚠️ 确认删除</h3>' +
      '<p>此操作不可撤销。确定要删除这条记录吗？</p>' +
      '<div class="sb-confirm-actions">' +
      '<button class="sb-confirm-cancel">取消</button>' +
      '<button class="sb-confirm-ok">确认删除</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    this.el = overlay;

    var self = this;
    var cancelBtn = overlay.querySelector(".sb-confirm-cancel");
    var okBtn = overlay.querySelector(".sb-confirm-ok");

    if (!cancelBtn || !okBtn) {
      console.warn("DeleteConfirm: failed to find expected child elements in overlay");
      return;
    }

    cancelBtn.addEventListener("click", function () {
      self.hide();
    });
    okBtn.addEventListener("click", function () {
      self.hide();
      if (self.onConfirm) self.onConfirm();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) self.hide();
    });
  },

  show: function () {
    if (this.el) this.el.style.display = "flex";
  },

  hide: function () {
    if (this.el) this.el.style.display = "none";
  }
};
