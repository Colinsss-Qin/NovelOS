/* Minimal writing-studio chapter tree. */

var ChapterClickHandler = null;
var TreeCallbacks = {};

function onChapterClick(fn) {
  ChapterClickHandler = fn;
}

function buildTree(volumes, treeEl, callbacks) {
  if (!treeEl) return;
  TreeCallbacks = callbacks || {};
  treeEl.innerHTML = "";

  var actions = document.createElement("div");
  actions.className = "tree-actions";
  actions.innerHTML = '<button class="tree-create-btn" id="tree-create-chapter">+ 新建章节</button>';
  treeEl.appendChild(actions);

  var createBtn = actions.querySelector("#tree-create-chapter");
  if (createBtn && TreeCallbacks.onCreateChapter) {
    createBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      TreeCallbacks.onCreateChapter();
    });
  }

  if (!volumes || volumes.length === 0) {
    var empty = document.createElement("div");
    empty.className = "tree-empty";
    empty.textContent = "暂无章节。点击“新建章节”开始。";
    treeEl.appendChild(empty);
    return;
  }

  volumes.forEach(function (vol) {
    var volDiv = document.createElement("div");
    volDiv.className = "volume";

    var header = document.createElement("div");
    header.className = "volume-header";
    header.innerHTML =
      '<span class="arrow open">▶</span>' +
      '<span class="vol-title">' + escHtml(vol.title || "正文") + '</span>' +
      '<button class="tree-add-ch-btn" title="新建章节">+</button>';

    var chList = document.createElement("div");
    chList.className = "chapters open";

    header.addEventListener("click", function (e) {
      if (e.target.closest(".tree-add-ch-btn")) return;
      var arrow = header.querySelector(".arrow");
      arrow.classList.toggle("open");
      chList.classList.toggle("open");
    });

    var addBtn = header.querySelector(".tree-add-ch-btn");
    if (addBtn && TreeCallbacks.onCreateChapter) {
      addBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        TreeCallbacks.onCreateChapter(vol.id);
      });
    }

    (vol.chapters || []).forEach(function (ch) {
      var chDiv = document.createElement("div");
      chDiv.className = "chapter";
      chDiv.setAttribute("data-chapter-id", ch.id);

      var wcText = ch.wordCount > 0 ? "<span class='wc'>" + formatWc(ch.wordCount) + "</span>" : "";
      chDiv.innerHTML =
        '<span class="ch-icon seed">§</span>' +
        '<span class="ch-name">第 ' + ((ch.order || 0) + 1) + " 章 " + escHtml(ch.title || "未命名章节") + "</span>" +
        wcText;

      chDiv.addEventListener("click", function (e) {
        e.stopPropagation();
        if (ChapterClickHandler) ChapterClickHandler(ch.id, ch);
        highlightChapter(ch.id);
      });

      chList.appendChild(chDiv);
    });

    volDiv.appendChild(header);
    volDiv.appendChild(chList);
    treeEl.appendChild(volDiv);
  });
}

function highlightChapter(chapterId) {
  document.querySelectorAll(".chapter").forEach(function (el) {
    el.classList.remove("active");
  });
  var target = document.querySelector('.chapter[data-chapter-id="' + chapterId + '"]');
  if (target) target.classList.add("active");
}

function escHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatWc(n) {
  if (!n) return "0";
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
