/* QuickActions — AI generate button + recent items */
var QuickActions = {
  el: null,
  onAIGenerate: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;

    this.el.addEventListener("click", function (e) {
      if (e.target.classList.contains("sb-ai-gen-btn")) {
        var genType = e.target.getAttribute("data-gen-type") || "character";
        if (self.onAIGenerate) self.onAIGenerate(genType);
      }
    });
  },

  /**
   * @param {string} type — current active knowledge type
   * @param {string} projectId
   */
  render: function (type, projectId) {
    if (!this.el) return;

    var typeLabel = KnowledgeTypeLabel[type] || type;

    var html = "";
    html +=
      '<div class="sb-quick-section">' +
      '<h3>快速操作</h3>' +
      '<button class="sb-ai-gen-btn" data-gen-type="' + type + '">' +
      "🤖 AI 生成" + typeLabel +
      "</button>" +
      "</div>";

    // Recent items
    var result = KnowledgeSkill.list({ projectId: projectId, type: type, limit: 5 });
    if (result.data && result.data.items && result.data.items.length > 0) {
      html += '<div class="sb-quick-section"><h3>最近编辑</h3><div class="sb-recent-list">';
      result.data.items.forEach(function (item) {
        html +=
          '<div class="sb-recent-item">' +
          '<span class="sb-recent-name">' + _esc(item.name) + "</span>" +
          '<span class="sb-recent-type">' + typeLabel + "</span>" +
          "</div>";
      });
      html += "</div></div>";
    }

    this.el.innerHTML = html;
  }
};
