/* ================================================================
   Layout Skill / Public API
   Orchestrates all layout sub-modules.
   Exposed as window.LayoutSkill.
   ================================================================ */

var toastTimer;

(function () {

  // ==============================================================
  //  Toast
  // ==============================================================
  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.opacity = "0"; }, 2000);
  }

  // ==============================================================
  //  Tab switch (demo stub)
  // ==============================================================
  function switchTab(name, btn) {
    // Highlight active nav button
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    if (btn) btn.classList.add("active");

    // Toggle views
    var warView = document.getElementById("view-war-room");
    var bibleView = document.getElementById("view-story-bible");
    var mapView = document.getElementById("view-story-map");
    var charView = document.getElementById("view-character-manager");
    var outlineView = document.getElementById("view-outline-board");
    var studioView = document.getElementById("view-studio");
    var futureView = document.getElementById("view-future-scene");

    // Hide all views first
    [warView, bibleView, mapView, charView, outlineView, studioView, futureView].forEach(function (v) {
      if (v) v.style.display = "none";
    });

    if (name === "bible") {
      if (bibleView) { bibleView.style.display = "flex"; StoryBible.refresh(); }
    } else if (name === "war") {
      if (warView) { warView.style.display = "flex"; if (typeof WarRoom !== "undefined") WarRoom.refresh(); }
    } else if (name === "map") {
      if (mapView) { mapView.style.display = "flex"; if (typeof StoryMap !== "undefined") StoryMap.refresh(); }
    } else if (name === "character") {
      if (charView) { charView.style.display = "flex"; if (typeof CharacterManager !== "undefined") CharacterManager.refresh(); }
    } else if (name === "outline") {
      if (outlineView) { outlineView.style.display = "flex"; if (typeof OutlineBoard !== "undefined") OutlineBoard.refresh(); }
    } else if (name === "studio") {
      if (studioView) studioView.style.display = "flex";
    } else if (name === "future") {
      if (futureView) { futureView.style.display = "flex"; if (typeof FutureScene !== "undefined") FutureScene.refresh(); }
    } else {
      showToast("切换至" + name + "（功能开发中）");
    }
  }

  // ==============================================================
  //  Init — wire everything together
  // ==============================================================
  /**
   * Boot the layout skill.
   * @param {object} data    — novelData { volumes: [...] }
   * @param {object} chMap   — chapter id → chapter object map
   */
  function init(data, chMap) {
    var treeEl = document.getElementById("story-tree");

    // 1. Build tree
    buildTree(data, treeEl);

    // 2. Register chapter click → update editor + context panel
    onChapterClick(function (chapterId) {
      var ch = chMap[chapterId];
      if (!ch) return;

      highlightChapter(chapterId);
      renderEditor(ch);
      renderContextPanel(ch);
    });

    // 3. Auto-select first chapter
    var firstVol = data.volumes[0];
    if (firstVol && firstVol.chapters.length > 0) {
      // Expand first volume
      var volHeaders = document.querySelectorAll(".volume-header");
      if (volHeaders.length >= 1) {
        var arrow = volHeaders[0].querySelector(".arrow");
        var list = volHeaders[0].nextElementSibling;
        arrow.classList.add("open");
        list.classList.add("open");
      }
      // Trigger via the click handler
      var firstId = firstVol.chapters[0].id;
      highlightChapter(firstId);
      renderEditor(chMap[firstId]);
      renderContextPanel(chMap[firstId]);
    }
  }

  // ==============================================================
  //  Public API (attached to window)
  // ==============================================================
  window.LayoutSkill = {
    init: init,
    showToast: showToast,
    switchTab: switchTab
  };

})();
