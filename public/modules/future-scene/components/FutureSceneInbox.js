/* ================================================================
   FutureSceneInbox — Inbox / list view (sortable table)
   ================================================================ */

var FutureSceneInbox = {
  el: null,
  scenes: [],
  sortBy: "updatedAt",
  sortOrder: "desc",
  onSelect: null,
  onSort: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (scenes, sortBy, sortOrder) {
    if (!this.el) return;
    this.scenes = scenes || [];
    this.sortBy = sortBy || this.sortBy;
    this.sortOrder = sortOrder || this.sortOrder;

    if (this.scenes.length === 0) {
      this.el.innerHTML = '<div class="fs-empty"><div class="fs-empty-icon">📥</div><div class="fs-empty-text">暂无场景</div><div class="fs-empty-sub">点击「+ 新建场景」创建你的第一个未来场景</div></div>';
      return;
    }

    var self = this;
    var html = '<div class="fs-inbox"><table class="fs-inbox-table"><thead><tr>';

    var cols = [
      { key: "title",       label: "标题",   cls: "fs-col-title" },
      { key: "sceneType",   label: "类型",   cls: "fs-col-type" },
      { key: "importance",  label: "重要性", cls: "fs-col-importance" },
      { key: "status",      label: "状态",   cls: "fs-col-status" },
      { key: "emotionGoal", label: "情绪目标",cls: "fs-col-emotion" },
      { key: "updatedAt",   label: "更新时间",cls: "fs-col-time" },
    ];

    cols.forEach(function (col) {
      var arrow = "";
      if (self.sortBy === col.key) {
        arrow = self.sortOrder === "asc" ? " ▲" : " ▼";
      }
      html += '<th class="' + col.cls + ' fs-sortable" data-sort="' + col.key + '">' + col.label + arrow + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Sort
    var sorted = this.scenes.slice().sort(function (a, b) {
      var va = a[self.sortBy] || "";
      var vb = b[self.sortBy] || "";
      if (self.sortBy === "updatedAt" || self.sortBy === "createdAt") {
        va = va || "";
        vb = vb || "";
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return self.sortOrder === "asc" ? -1 : 1;
      if (va > vb) return self.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    sorted.forEach(function (s) {
      html += '<tr class="fs-inbox-row" data-id="' + s.id + '">';
      html += '<td class="fs-col-title">' + _esc(s.title) + '</td>';
      html += '<td class="fs-col-type">' + (s.sceneType ? '<span class="fs-tag">' + _esc(s.sceneType) + '</span>' : "-") + '</td>';
      html += '<td class="fs-col-importance">' + _renderImportance(s.importance) + '</td>';
      html += '<td class="fs-col-status">' + _renderStatusBadge(s.status) + '</td>';
      html += '<td class="fs-col-emotion">' + (s.emotionGoal ? _esc(s.emotionGoal) : "-") + '</td>';
      html += '<td class="fs-col-time">' + _formatDate(s.updatedAt) + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    this.el.innerHTML = html;
    this._bind();
  },

  _bind: function () {
    var self = this;

    this.el.querySelectorAll(".fs-inbox-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = this.getAttribute("data-id");
        if (self.onSelect) self.onSelect(id);
      });
    });

    this.el.querySelectorAll(".fs-sortable").forEach(function (th) {
      th.addEventListener("click", function () {
        var key = this.getAttribute("data-sort");
        var newOrder = (self.sortBy === key && self.sortOrder === "asc") ? "desc" : "asc";
        if (self.onSort) self.onSort(key, newOrder);
      });
    });
  },
};

// ── helpers ──

function _renderImportance(imp) {
  var map = { high: ["★", "#e07070"], medium: ["●", "#d4a574"], low: ["○", "#6b6880"] };
  var v = map[imp] || map["medium"];
  return '<span style="color:' + v[1] + '">' + v[0] + "</span>";
}

function _renderStatusBadge(status) {
  var colors = { "构思中": "#6b6880", "规划中": "#d4a574", "推进中": "#6b9aed", "已完成": "#5aab8a", "废弃": "#c06060" };
  var c = colors[status] || "#6b6880";
  return '<span class="fs-status-badge" style="background:' + c + '">' + (status || "构思中") + "</span>";
}

function _formatDate(d) {
  if (!d) return "-";
  var s = String(d).slice(0, 16).replace("T", " ");
  return s;
}
