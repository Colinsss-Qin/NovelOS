/* ================================================================
   FutureSceneBoard — Kanban board (5 status columns, drag-and-drop)
   ================================================================ */

var FutureSceneBoard = {
  el: null,
  scenes: [],
  COLUMNS: [
    { key: "构思中", label: "💡 构思中", color: "#6b6880" },
    { key: "规划中", label: "📋 规划中", color: "#d4a574" },
    { key: "推进中", label: "🚀 推进中", color: "#6b9aed" },
    { key: "已完成", label: "✅ 已完成", color: "#5aab8a" },
    { key: "废弃",   label: "🗑️ 废弃",   color: "#c06060" },
  ],
  onStatusChange: null,
  onCardClick: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (scenes) {
    if (!this.el) return;
    this.scenes = scenes || [];

    var self = this;
    var html = '<div class="fs-board">';
    this.COLUMNS.forEach(function (col) {
      var items = self.scenes.filter(function (s) { return (s.status || "构思中") === col.key; });
      html += '<div class="fs-board-col">';
      html += '<div class="fs-board-col-header" style="border-top:3px solid ' + col.color + '">';
      html += '<span>' + col.label + '</span>';
      html += '<span class="fs-board-count">' + items.length + '</span>';
      html += '</div>';
      html += '<div class="fs-board-list" data-status="' + col.key + '">';
      items.forEach(function (s) {
        html += self._renderCard(s);
      });
      html += '</div></div>';
    });
    html += '</div>';
    this.el.innerHTML = html;
    this._bind();
  },

  _renderCard: function (s) {
    var impIcons = { high: "★", medium: "●", low: "○" };
    var impIcon = impIcons[s.importance] || "●";
    var typeLabel = s.sceneType || "";
    var emotionLabel = s.emotionGoal || "";
    var charCount = (s.targetCharacters || []).length;
    var locCount  = (s.targetLocations || []).length;
    var facCount  = (s.targetFactions || []).length;
    var hasEntities = charCount + locCount + facCount > 0;

    return (
      '<div class="fs-board-card" draggable="true" data-id="' + s.id + '" data-status="' + (s.status || "构思中") + '">' +
      '<div class="fs-card-title">' + _esc(s.title) + '</div>' +
      '<div class="fs-card-meta">' +
      (typeLabel ? '<span class="fs-card-type">' + _esc(typeLabel) + '</span>' : '') +
      '<span class="fs-card-importance fs-imp-' + (s.importance || "medium") + '">' + impIcon + '</span>' +
      '</div>' +
      (emotionLabel ? '<div class="fs-card-emotion">🎯 ' + _esc(emotionLabel) + '</div>' : '') +
      (hasEntities ? '<div class="fs-card-entities"><span>👤 ' + charCount + '</span><span>📍 ' + locCount + '</span><span>⚔️ ' + facCount + '</span></div>' : '') +
      '</div>'
    );
  },

  _bind: function () {
    var self = this;
    if (!this.el) return;

    // Card click
    this.el.querySelectorAll(".fs-board-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        // Don't fire click during drag
        if (self._dragging) return;
        var id = this.getAttribute("data-id");
        if (self.onCardClick) self.onCardClick(id);
      });
    });

    // Drag cards
    this.el.querySelectorAll(".fs-board-card[draggable]").forEach(function (card) {
      card.addEventListener("dragstart", function (e) {
        self._dragging = true;
        e.dataTransfer.setData("text/plain", JSON.stringify({
          id: this.getAttribute("data-id"),
          fromStatus: this.getAttribute("data-status"),
        }));
        this.style.opacity = "0.4";
        setTimeout(function () { self._dragging = false; }, 100);
      });
      card.addEventListener("dragend", function () { this.style.opacity = "1"; });
    });

    // Drop zones
    this.el.querySelectorAll(".fs-board-list").forEach(function (list) {
      list.addEventListener("dragover", function (e) {
        e.preventDefault();
        this.classList.add("fs-dragover");
      });
      list.addEventListener("dragleave", function () {
        this.classList.remove("fs-dragover");
      });
      list.addEventListener("drop", function (e) {
        e.preventDefault();
        this.classList.remove("fs-dragover");
        try {
          var dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
          var newStatus = this.getAttribute("data-status");
          if (dragData.fromStatus !== newStatus && self.onStatusChange) {
            self.onStatusChange(dragData.id, newStatus);
          }
        } catch (err) {}
      });
    });
  },
};
