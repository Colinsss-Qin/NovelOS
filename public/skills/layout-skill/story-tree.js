/* ================================================================
   Layout Skill / Story Tree
   Builds the volume/chapter tree DOM in the left sidebar.
   Binds click events and dispatches to the registered callback.
   ================================================================ */

var ChapterClickHandler = null;

/**
 * Register a callback to fire when a chapter is clicked.
 * @param {function(string): void} fn - receives chapterId
 */
function onChapterClick(fn) {
  ChapterClickHandler = fn;
}

/**
 * Build the full story tree from novelData.
 * @param {object} novelData - { volumes: [...] }
 * @param {HTMLElement} treeEl - the #story-tree container
 */
function buildTree(novelData, treeEl) {
  treeEl.innerHTML = "";

  novelData.volumes.forEach(function (vol) {
    var volDiv = document.createElement("div");
    volDiv.className = "volume";

    // Volume header
    var header = document.createElement("div");
    header.className = "volume-header";
    header.innerHTML =
      '<span class="arrow' + (vol.status === "writing" ? " open" : "") + '">▶</span>' +
      vol.title +
      '<span class="status ' + (vol.status === "completed" ? "done" : "writing") + '">' +
      (vol.status === "completed" ? "✓" : "✎") +
      "</span>";

    // Chapters container
    var chList = document.createElement("div");
    chList.className = "chapters" + (vol.status === "writing" ? " open" : "");

    // Toggle volume expand/collapse
    header.addEventListener("click", function () {
      var arrow = this.querySelector(".arrow");
      var list = this.nextElementSibling;
      arrow.classList.toggle("open");
      list.classList.toggle("open");
    });

    // Build chapter items
    vol.chapters.forEach(function (ch) {
      var chDiv = document.createElement("div");
      chDiv.className = "chapter";
      chDiv.setAttribute("data-chapter-id", ch.id);

      var iconClass =
        ch.status === "finalized" ? "done" :
        ch.status === "generated" ? "writing" : "seed";
      var icon =
        ch.status === "finalized" ? "✓" :
        ch.status === "generated" ? "📝" : "🌱";
      var wcText =
        ch.wordCount > 0
          ? "<span class='wc'>" + (ch.wordCount / 1000).toFixed(1) + "k</span>"
          : "";

      chDiv.innerHTML =
        '<span class="ch-icon ' + iconClass + '">' + icon + "</span>" +
        "第" + ch.order + "章 " + ch.title +
        wcText;

      // Bind chapter click
      chDiv.addEventListener("click", function (e) {
        e.stopPropagation();
        if (ChapterClickHandler) {
          ChapterClickHandler(ch.id);
        }
      });

      chList.appendChild(chDiv);
    });

    volDiv.appendChild(header);
    volDiv.appendChild(chList);
    treeEl.appendChild(volDiv);
  });
}

/**
 * Highlight a chapter in the tree by its id.
 * @param {string} chapterId
 */
function highlightChapter(chapterId) {
  var all = document.querySelectorAll(".chapter");
  all.forEach(function (el) { el.classList.remove("active"); });
  var target = document.querySelector('.chapter[data-chapter-id="' + chapterId + '"]');
  if (target) target.classList.add("active");
}
