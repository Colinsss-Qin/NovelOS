/* ItemCard — single knowledge item card in list view */
var ItemCard = {
  /**
   * @param {object} item — KnowledgeItem
   * @param {boolean} isActive
   * @returns {string} HTML
   */
  render: function (item, isActive) {
    var tagsHtml = "";
    if (item.tags && item.tags.length > 0) {
      tagsHtml = '<div class="sb-card-tags">' +
        item.tags.slice(0, 4).map(function (t) {
          return '<span class="sb-card-tag">' + _esc(t) + "</span>";
        }).join("") +
        "</div>";
    }

    var typeLabel = KnowledgeTypeLabel[item.type] || item.type;

    return (
      '<div class="sb-card' + (isActive ? " active" : "") + '" data-id="' + item.id + '">' +
      '<div class="sb-card-head">' +
      '<span class="sb-card-name">' + _esc(item.name) + "</span>" +
      '<span class="sb-card-type">' + typeLabel + "</span>" +
      "</div>" +
      (item.summary ? '<p class="sb-card-summary">' + _esc(item.summary) + "</p>" : "") +
      tagsHtml +
      "</div>"
    );
  }
};

function _esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
