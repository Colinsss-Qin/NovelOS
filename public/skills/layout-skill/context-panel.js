/* ================================================================
   Layout Skill / Context Panel
   Renders the right-side AI assistant panel:
   - Story seed (剧情种子)
   - Involved characters (涉及角色)
   - Related settings (相关设定)
   - Chapter metadata (章节信息)
   ================================================================ */

/**
 * Populate the right panel with chapter context.
 * @param {object} ch — chapter object with { seed, characters[], settings[], _volumeTitle, status, wordCount }
 */
function renderContextPanel(ch) {
  var html = "";

  // Seed
  html +=
    '<div class="section">' +
    '<div class="section-title">🌱 剧情种子</div>' +
    '<div class="seed-hint">' + ch.seed + "</div>" +
    "</div>";

  // Characters
  html += '<div class="section"><div class="section-title">👤 涉及角色</div>';
  ch.characters.forEach(function (c) {
    html +=
      '<div class="char-card">' +
      '<div class="avatar">' + c.avatar + "</div>" +
      '<div class="info">' +
      '<div class="name">' + c.name +
      ' <span class="role">' + c.role + "</span></div>" +
      '<div class="desc">' + c.desc + "</div>" +
      "</div></div>";
  });
  html += "</div>";

  // Settings
  html += '<div class="section"><div class="section-title">📜 相关设定</div>';
  ch.settings.forEach(function (s) {
    html +=
      '<div class="setting-item">' +
      '<div class="s-name">' + s.name +
      ' <span style="font-weight:400;color:#6b6880;font-size:10px">[' +
      s.category + "]</span></div>" +
      s.desc +
      "</div>";
  });
  html += "</div>";

  // Meta
  html +=
    '<div class="section">' +
    '<div class="section-title">📋 章节信息</div>' +
    '<div class="ctx-item"><div class="ctx-label">所属卷</div>' +
    '<div class="ctx-value">' + ch._volumeTitle + "</div></div>" +
    '<div class="ctx-item"><div class="ctx-label">状态</div>' +
    '<div class="ctx-value">' + ch.status + "</div></div>" +
    '<div class="ctx-item"><div class="ctx-label">字数</div>' +
    '<div class="ctx-value">' + ch.wordCount.toLocaleString() + " 字</div></div>" +
    "</div>";

  document.getElementById("right-content").innerHTML = html;
}
