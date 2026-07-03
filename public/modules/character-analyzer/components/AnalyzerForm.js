/* ================================================================
   AnalyzerForm — 左侧表单：选择角色 / 章节 / 检查类别
   ================================================================ */

var AnalyzerForm = {
  el: null,
  characters: [],
  chapters: [],
  onAnalyze: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  /**
   * Render the form with available characters and chapters.
   */
  render: function (characters, chapters) {
    if (!this.el) return;
    this.characters = characters || [];
    this.chapters = chapters || [];
    this._render();
  },

  _render: function () {
    if (!this.el) return;

    var charOptions = this.characters
      .map(function (c) { return '<option value="' + c.id + '">' + _esc(c.name) + "</option>"; })
      .join("");

    var chapterChecks = this.chapters
      .map(function (ch) {
        return (
          '<label class="ca-check-item">' +
          '<input type="checkbox" value="' + ch.id + '" class="ca-chapter-check">' +
          _esc(ch.title || "第" + ch.order + "章") +
          "</label>"
        );
      })
      .join("");

    this.el.innerHTML =
      '<div class="ca-section-title">👤 选择角色</div>' +
      '<select class="ca-select" id="ca-char-select">' +
      '<option value="">-- 选择角色 --</option>' +
      charOptions +
      "</select>" +
      '<div class="ca-section-title">📖 选择章节</div>' +
      '<div class="ca-check-list" id="ca-chapter-list">' +
      (chapterChecks || '<div style="color:#555;font-size:12px;padding:8px">暂无可选章节</div>') +
      "</div>" +
      '<div class="ca-section-title">🔍 检查类别</div>' +
      '<div class="ca-check-categories" id="ca-categories">' +
      '<span class="ca-cat-chip active" data-cat="personality">性格一致</span>' +
      '<span class="ca-cat-chip active" data-cat="ability">能力一致</span>' +
      '<span class="ca-cat-chip active" data-cat="age">年龄一致</span>' +
      '<span class="ca-cat-chip active" data-cat="relation">关系冲突</span>' +
      '<span class="ca-cat-chip active" data-cat="behavior">行为异常</span>' +
      "</div>" +
      '<button class="ca-submit-btn" id="ca-submit-btn">🔍 开始分析</button>' +
      '<div class="ca-loading" id="ca-loading">⏳ 正在分析角色一致性…</div>';

    this._bind();
    this._bindCategories();
  },

  _bind: function () {
    var self = this;
    var btn = document.getElementById("ca-submit-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        // Validate
        var charId = document.getElementById("ca-char-select").value;
        if (!charId) { LayoutSkill.showToast("请先选择角色"); return; }

        var checks = document.querySelectorAll(".ca-chapter-check:checked");
        if (checks.length === 0) { LayoutSkill.showToast("请至少选择一个章节"); return; }

        var chapterIds = [];
        checks.forEach(function (cb) { chapterIds.push(cb.value); });

        var cats = [];
        document.querySelectorAll(".ca-cat-chip.active").forEach(function (chip) {
          cats.push(chip.getAttribute("data-cat"));
        });
        if (cats.length === 0) { LayoutSkill.showToast("请至少选择一个检查类别"); return; }

        // Show loading
        document.getElementById("ca-loading").classList.add("visible");
        btn.disabled = true;

        if (self.onAnalyze) self.onAnalyze(charId, chapterIds, cats);
      });
    }
  },

  _bindCategories: function () {
    var chips = document.querySelectorAll(".ca-cat-chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        this.classList.toggle("active");
      });
    });
  },

  setLoading: function (loading) {
    var btn = document.getElementById("ca-submit-btn");
    var loadingEl = document.getElementById("ca-loading");
    if (btn) btn.disabled = loading;
    if (loadingEl) {
      loadingEl.classList.toggle("visible", loading);
    }
  },
};
