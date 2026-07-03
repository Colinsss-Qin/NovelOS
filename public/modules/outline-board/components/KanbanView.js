/* ================================================================
   KanbanView — 看板视图（按章节状态分列）
   列：未开始 | 写作中 | 完成
   ================================================================ */

var KanbanView = {
  el: null,
  treeData: null,
  COLUMNS: [
    { key: "未开始", label: "📋 待规划", color: "#6b6880" },
    { key: "写作中", label: "✍️ 进行中", color: "#d4a574" },
    { key: "完成", label: "✅ 已完成", color: "#5aab8a" },
  ],

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (tree) {
    if (!this.el) return;
    this.treeData = tree;
    if (!tree || !tree.volumes) {
      this.el.innerHTML = '<div class="ob-tree-empty">暂无数据</div>';
      return;
    }

    // Collect all chapters with their scenes and volume info
    var allChapters = [];
    tree.volumes.forEach(function (vol) {
      (vol.chapters || []).forEach(function (ch) {
        allChapters.push({
          id: ch.id, title: ch.title, status: ch.status || "未开始",
          summary: ch.summary, goal: ch.goal,
          volumeTitle: vol.title, volumeId: vol.id,
          sceneCount: (ch.scenes || []).length,
          scenes: ch.scenes || [],
        });
      });
    });

    var self = this;
    var html = '<div class="ob-kanban">';
    this.COLUMNS.forEach(function (col) {
      var items = allChapters.filter(function (c) { return c.status === col.key; });
      html += '<div class="ob-kanban-col">';
      html += '<div class="ob-kanban-col-header" style="color:' + col.color + '">' + col.label + ' <span class="ob-kanban-count">' + items.length + '</span></div>';
      html += '<div class="ob-kanban-list" data-status="' + col.key + '">';
      items.forEach(function (ch) {
        html += self._renderCard(ch);
      });
      html += '</div></div>';
    });
    html += '</div>';
    this.el.innerHTML = html;
    this._bind();
  },

  _renderCard: function (ch) {
    return (
      '<div class="ob-kanban-card" draggable="true" data-id="' + ch.id + '" data-type="chapter">' +
      '<div class="ob-kanban-card-title">' + _esc(ch.title) + '</div>' +
      '<div class="ob-kanban-card-meta">' +
      '<span>📘 ' + _esc(ch.volumeTitle) + '</span>' +
      '</div>' +
      (ch.sceneCount > 0 ? '<div class="ob-kanban-card-scenes">🎬 ' + ch.sceneCount + ' 个场景</div>' : '') +
      '</div>'
    );
  },

  _bind: function () {
    var self = this;
    if (!this.el) return;

    // Drag cards between columns
    this.el.querySelectorAll(".ob-kanban-card[draggable]").forEach(function (card) {
      card.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", JSON.stringify({ id: this.getAttribute("data-id"), type: "chapter" }));
        this.style.opacity = "0.4";
      });
      card.addEventListener("dragend", function () { this.style.opacity = "1"; });
    });

    // Drop zones
    this.el.querySelectorAll(".ob-kanban-list").forEach(function (list) {
      list.addEventListener("dragover", function (e) { e.preventDefault(); this.classList.add("dragover"); });
      list.addEventListener("dragleave", function () { this.classList.remove("dragover"); });
      list.addEventListener("drop", function (e) {
        e.preventDefault();
        this.classList.remove("dragover");
        var dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
        var newStatus = this.getAttribute("data-status");
        // Update chapter status via API
        BoardService.updateChapter(dragData.id, { status: newStatus }).then(function (r) {
          if (r.success && self.onRefresh) {
            LayoutSkill.showToast("已移至「" + newStatus + "」");
            self.onRefresh();
          }
        });
      });
    });
  },
};
