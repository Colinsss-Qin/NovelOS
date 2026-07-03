/* ================================================================
   QuickCreate — 快速创建模态框
   支持创建 Volume / Chapter / Scene
   ================================================================ */

var QuickCreate = {
  el: null,
  _overlay: null,
  _resolve: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
  },

  /**
   * Open quick-create modal.
   * @param {string} type — "volume" | "chapter" | "scene"
   * @param {object} ctx — { storyId?, volumeId?, chapterId? }
   * @returns {Promise<object>} created data
   */
  open: function (type, ctx) {
    var self = this;
    return new Promise(function (resolve) {
      self._resolve = resolve;
      self._render(type, ctx || {});
    });
  },

  _render: function (type, ctx) {
    var self = this;
    var labels = { volume: "新建卷", chapter: "新建章节", scene: "新建场景" };
    var overlay = document.createElement("div");
    overlay.className = "ob-modal-overlay";
    overlay.innerHTML =
      '<div class="ob-modal">' +
      "<h3>" + (labels[type] || "新建") + "</h3>" +
      _formField("标题", "qc-title", "text", "请输入标题") +
      (type === "chapter" || type === "scene"
        ? _formField("摘要/描述", "qc-summary", "textarea", "简短描述（可选）")
        : "") +
      (type === "chapter"
        ? _formField("本章目标", "qc-goal", "text", "本章的叙事目标（可选）")
        : "") +
      (type === "scene"
        ? '<div class="ob-form-row">' +
          _formField("冲突", "qc-conflict", "text", "核心冲突（可选）") +
          _formField("结果", "qc-result", "text", "场景结果（可选）") +
          "</div>"
        : "") +
      '<div class="ob-form-actions">' +
      '<button class="ob-form-cancel" id="qc-cancel">取消</button>' +
      '<button class="ob-form-submit" id="qc-submit">创建</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);
    this._overlay = overlay;

    function _formField(label, id, tag, placeholder) {
      if (tag === "textarea") {
        return '<div class="ob-form-group"><label class="ob-form-label">' + label + '</label><textarea class="ob-form-input" id="' + id + '" placeholder="' + placeholder + '" rows="2"></textarea></div>';
      }
      return '<div class="ob-form-group"><label class="ob-form-label">' + label + '</label><input type="text" class="ob-form-input" id="' + id + '" placeholder="' + placeholder + '">';
    }

    // Bind
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) self.close();
    });
    overlay.querySelector("#qc-cancel").addEventListener("click", function () { self.close(); });
    overlay.querySelector("#qc-submit").addEventListener("click", function () {
      var title = (document.getElementById("qc-title") || {}).value;
      if (!title || !title.trim()) { LayoutSkill.showToast("标题不能为空"); return; }
      var data = { title: title.trim() };
      var summary = document.getElementById("qc-summary");
      if (summary) data.summary = summary.value.trim();
      var goal = document.getElementById("qc-goal");
      if (goal) data.goal = goal.value.trim();
      var conflict = document.getElementById("qc-conflict");
      if (conflict) data.conflict = conflict.value.trim();
      var result = document.getElementById("qc-result");
      if (result) data.result = result.value.trim();

      // Attach parent context
      if (ctx.storyId) data.storyId = ctx.storyId;
      if (ctx.volumeId) data.volumeId = ctx.volumeId;
      if (ctx.chapterId) data.chapterId = ctx.chapterId;

      self.close();
      if (self._resolve) self._resolve({ type: type, data: data });
    });

    // Focus
    setTimeout(function () {
      var input = document.getElementById("qc-title");
      if (input) input.focus();
    }, 100);
  },

  close: function () {
    if (this._overlay) {
      document.body.removeChild(this._overlay);
      this._overlay = null;
    }
  },
};
