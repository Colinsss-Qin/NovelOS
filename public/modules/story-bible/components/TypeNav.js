/* TypeNav — left sidebar type list with counts */
var TypeNav = {
  el: null,
  activeType: "character",
  onChange: null,

  /** @param {string} containerId */
  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  /** @param {string} projectId */
  render: function (projectId) {
    if (!this.el) return;
    var self = this;

    // Get all items and count by type
    var result = KnowledgeSkill.list({ projectId: projectId, limit: 1000 });
    var counts = {};
    if (result.data && result.data.items) {
      result.data.items.forEach(function (item) {
        counts[item.type] = (counts[item.type] || 0) + 1;
      });
    }

    var types = Object.keys(KnowledgeType).map(function (k) {
      return KnowledgeType[k];
    });

    var html = '<div class="sb-type-list">';
    types.forEach(function (type) {
      var label = KnowledgeTypeLabel[type] || type;
      var count = counts[type] || 0;
      var active = type === self.activeType ? " active" : "";
      html +=
        '<div class="sb-type-item' + active + '" data-type="' + type + '">' +
        '<span class="sb-type-icon">' + _typeIcon(type) + "</span>" +
        '<span class="sb-type-label">' + label + "</span>" +
        '<span class="sb-type-count">' + count + "</span>" +
        "</div>";
    });
    html += "</div>";

    this.el.innerHTML = html;

    // Bind clicks
    var items = this.el.querySelectorAll(".sb-type-item");
    items.forEach(function (item) {
      item.addEventListener("click", function () {
        var type = this.getAttribute("data-type");
        self.setActive(type);
        if (self.onChange) self.onChange(type);
      });
    });
  },

  setActive: function (type) {
    this.activeType = type;
    var items = this.el.querySelectorAll(".sb-type-item");
    items.forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-type") === type);
    });
  }
};

function _typeIcon(type) {
  var map = {
    "character": "👤", "faction": "🏛️", "nation": "👑", "sect": "🏰",
    "location": "📍", "artifact": "⚔️", "technique": "📖",
    "rule": "📜", "history_event": "📅", "timeline_node": "⏳"
  };
  return map[type] || "📄";
}
