/* Minimal writing editor helpers. */

function formatChapterStatus(status) {
  var map = {
    draft: "草稿",
    generated: "已生成",
    finalized: "已定稿",
    completed: "已完成",
  };
  return map[status] || status || "草稿";
}

function renderEditor(ch) {
  if (!ch) return;

  var titleEl = document.getElementById("ch-title");
  var metaEl = document.getElementById("ch-meta");
  var emptyState = document.getElementById("empty-state");
  var editor = document.getElementById("editor");

  if (titleEl) titleEl.textContent = "第 " + ((ch.order || 0) + 1) + " 章 " + (ch.title || "未命名章节");
  if (metaEl) {
    metaEl.textContent = (ch.wordCount || 0).toLocaleString() + " 字 · " + formatChapterStatus(ch.status);
  }
  if (emptyState) emptyState.style.display = "none";
  if (editor) {
    editor.style.display = "block";
    editor.disabled = false;
    editor.value = ch.content || "";
    editor.focus();
  }
}

function clearEditor() {
  var emptyState = document.getElementById("empty-state");
  var editor = document.getElementById("editor");
  var titleEl = document.getElementById("ch-title");
  var metaEl = document.getElementById("ch-meta");

  if (emptyState) emptyState.style.display = "flex";
  if (editor) {
    editor.style.display = "none";
    editor.disabled = false;
    editor.value = "";
  }
  if (titleEl) titleEl.textContent = "选择章节开始写作";
  if (metaEl) metaEl.textContent = "";
}
