/* CharRelationList — relation item renderer */
var CharRelationList = {
  /**
   * Render a single relation item.
   * If characterNameMap is provided, resolve IDs to names.
   */
  renderItem: function (rel, charNameMap) {
    var map = charNameMap || {};
    var sourceName = map[rel.sourceCharacterId] || rel.sourceCharacterId;
    var targetName = map[rel.targetCharacterId] || rel.targetCharacterId;

    return (
      '<div class="cm-rel-item">' +
      '<span class="cm-rel-type">' + _esc(rel.relationType) + "</span>" +
      '<span class="cm-rel-name">' + _esc(targetName) + "</span>" +
      (rel.description ? '<span class="cm-rel-desc">' + _esc(rel.description) + "</span>" : "") +
      "</div>"
    );
  },
};
