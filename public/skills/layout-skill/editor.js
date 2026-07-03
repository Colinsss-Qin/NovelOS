/* ================================================================
   Layout Skill / Editor
   Updates the center writing studio area:
   - Toolbar (title + word count)
   - Textarea content
   - Visibility toggle between empty-state and editor
   ================================================================ */

/**
 * Render a chapter into the center editor area.
 * @param {object} ch — chapter object with { order, title, wordCount, status, content }
 */
function renderEditor(ch) {
  // Toolbar
  document.getElementById("ch-title").textContent =
    "第" + ch.order + "章 " + ch.title;
  document.getElementById("ch-meta").textContent =
    ch.wordCount.toLocaleString() + "字 · " +
    (ch.status === "generated" ? "已生成" :
     ch.status === "finalized" ? "已定稿" : "草稿");

  // Show editor, hide empty state
  document.getElementById("empty-state").style.display = "none";
  var editor = document.getElementById("editor");
  editor.style.display = "block";
  editor.value = ch.content || "";
}
