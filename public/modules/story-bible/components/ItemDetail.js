/* ItemDetail — detail view for a single KnowledgeItem */
var ItemDetail = {
  el: null,
  onBack: null,
  onEdit: null,
  onDelete: null,
  onAIExpand: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;

    this.el.addEventListener("click", function (e) {
      var target = e.target;
      if (target.classList.contains("sb-detail-back")) {
        if (self.onBack) self.onBack();
      } else if (target.classList.contains("sb-detail-edit")) {
        if (self.onEdit) self.onEdit();
      } else if (target.classList.contains("sb-detail-delete")) {
        if (self.onDelete) self.onDelete();
      } else if (target.classList.contains("sb-detail-ai")) {
        if (self.onAIExpand) self.onAIExpand();
      }
    });
  },

  /** @param {object} item — KnowledgeItem */
  show: function (item) {
    if (!this.el || !item) return;
    var typeLabel = KnowledgeTypeLabel[item.type] || item.type;

    var html = "";
    html += '<div class="sb-detail">';
    html +=
      '<button class="sb-detail-back">← 返回列表</button>' +
      '<h2 class="sb-detail-name">' + _esc(item.name) + "</h2>" +
      '<span class="sb-detail-type">' + typeLabel + "</span>";

    if (item.aliases && item.aliases.length > 0) {
      html +=
        '<p class="sb-detail-aliases">称号：' +
        item.aliases.map(_esc).join("、") +
        "</p>";
    }
    if (item.summary) {
      html += '<p class="sb-detail-summary">' + _esc(item.summary) + "</p>";
    }

    // Attrs
    if (item.attrs) {
      html += '<div class="sb-detail-attrs">';
      Object.keys(item.attrs).forEach(function (k) {
        var val = item.attrs[k];
        if (val === undefined || val === null || val === "") return;
        if (Array.isArray(val)) val = val.join("、");
        html +=
          '<div class="sb-detail-attr">' +
          '<span class="sb-detail-attr-key">' + _esc(k) + "</span>" +
          '<span class="sb-detail-attr-val">' + _esc(String(val)) + "</span>" +
          "</div>";
      });
      html += "</div>";
    }

    if (item.description) {
      html +=
        '<div class="sb-detail-desc">' +
        '<h3>详细描述</h3>' +
        '<div class="sb-detail-desc-content">' + _esc(item.description) + "</div>" +
        "</div>";
    }

    // Tags
    if (item.tags && item.tags.length > 0) {
      html += '<div class="sb-detail-tags">';
      item.tags.forEach(function (t) {
        html += '<span class="sb-detail-tag">' + _esc(t) + "</span>";
      });
      html += "</div>";
    }

    // Actions
    html += '<div class="sb-detail-actions">';
    html += '<button class="sb-detail-edit">✏️ 编辑</button>';
    html += '<button class="sb-detail-ai">🤖 AI 扩展</button>';
    html += '<button class="sb-detail-delete">🗑️ 删除</button>';
    html += "</div>";

    html += "</div>";
    this.el.innerHTML = html;
  },

  hide: function () {
    if (this.el) this.el.innerHTML = "";
  }
};
