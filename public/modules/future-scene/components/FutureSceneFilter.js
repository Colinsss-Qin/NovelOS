/* ================================================================
   FutureSceneFilter — Search bar + filter controls
   ================================================================ */

var FutureSceneFilter = {
  el: null,
  onFilter: null,
  _state: { query: "", status: "", sceneType: "", importance: "" },

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    this._render();
  },

  getState: function () { return this._state; },

  clear: function () {
    this._state = { query: "", status: "", sceneType: "", importance: "" };
    this._render();
    if (this.onFilter) this.onFilter(this._state);
  },

  _render: function () {
    var self = this;
    var s = this._state;
    this.el.innerHTML =
      '<div class="fs-filter">' +
      '<input class="fs-filter-search" id="fs-filter-query" type="text" placeholder="搜索场景..." value="' + _esc(s.query) + '">' +
      '<select class="fs-filter-select" id="fs-filter-status">' +
        '<option value="">全部状态</option>' +
        '<option value="构思中"' + (s.status === "构思中" ? " selected" : "") + '>构思中</option>' +
        '<option value="规划中"' + (s.status === "规划中" ? " selected" : "") + '>规划中</option>' +
        '<option value="推进中"' + (s.status === "推进中" ? " selected" : "") + '>推进中</option>' +
        '<option value="已完成"' + (s.status === "已完成" ? " selected" : "") + '>已完成</option>' +
        '<option value="废弃"'   + (s.status === "废弃" ? " selected" : "")   + '>废弃</option>' +
      '</select>' +
      '<select class="fs-filter-select" id="fs-filter-type">' +
        '<option value="">全部类型</option>' +
        '<option value="高潮"' + (s.sceneType === "高潮" ? " selected" : "") + '>高潮</option>' +
        '<option value="反转"' + (s.sceneType === "反转" ? " selected" : "") + '>反转</option>' +
        '<option value="战斗"' + (s.sceneType === "战斗" ? " selected" : "") + '>战斗</option>' +
        '<option value="情感"' + (s.sceneType === "情感" ? " selected" : "") + '>情感</option>' +
        '<option value="转折"' + (s.sceneType === "转折" ? " selected" : "") + '>转折</option>' +
        '<option value="结局"' + (s.sceneType === "结局" ? " selected" : "") + '>结局</option>' +
        '<option value="其他"' + (s.sceneType === "其他" ? " selected" : "") + '>其他</option>' +
      '</select>' +
      '<select class="fs-filter-select" id="fs-filter-importance">' +
        '<option value="">全部重要性</option>' +
        '<option value="high"'   + (s.importance === "high"   ? " selected" : "") + '>★ 核心</option>' +
        '<option value="medium"' + (s.importance === "medium" ? " selected" : "") + '>● 重要</option>' +
        '<option value="low"'    + (s.importance === "low"    ? " selected" : "") + '>○ 次要</option>' +
      '</select>' +
      '</div>';
    this._bind();
  },

  _bind: function () {
    var self = this;
    var debounceTimer;

    function _emit() {
      self._state = {
        query:      document.getElementById("fs-filter-query").value || "",
        status:     document.getElementById("fs-filter-status").value || "",
        sceneType:  document.getElementById("fs-filter-type").value || "",
        importance: document.getElementById("fs-filter-importance").value || "",
      };
      if (self.onFilter) self.onFilter(self._state);
    }

    var queryEl = document.getElementById("fs-filter-query");
    if (queryEl) {
      queryEl.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(_emit, 300);
      });
    }

    var selects = this.el.querySelectorAll(".fs-filter-select");
    selects.forEach(function (sel) { sel.addEventListener("change", _emit); });
  },
};
