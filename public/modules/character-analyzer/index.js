/* ================================================================
   Character Analyzer Module — 角色一致性分析
   输入：角色 + 章节 → AI 分析 → 一致性报告
   Exposed as window.CharacterAnalyzer
   ================================================================ */

(function () {
  var state = {
    projectId: "proj_demo",
    characters: [],
    chapters: [],
    chapterMap: {},
    relations: [],
    nameMap: {},
  };

  var container = null;

  // ═══════════════════════════════════
  //  INIT
  // ═══════════════════════════════════

  function init(containerId, projectId) {
    try {
      container = document.getElementById(containerId);
      if (!container) { console.error("CharacterAnalyzer: container not found"); return; }
      container.innerHTML = '<div style="padding:40px;color:#d4a574;text-align:center"><p>🔍 角色分析器加载中…</p></div>';

      state.projectId = projectId || "proj_demo";
      _renderLayout();
      _initComponents();
      _loadData();
    } catch (e) {
      console.error("CharacterAnalyzer init error:", e.message);
      container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>角色分析器初始化错误</h3><pre>' + e.message + "</pre></div>";
    }
  }

  // ═══════════════════════════════════
  //  LAYOUT
  // ═══════════════════════════════════

  function _renderLayout() {
    container.innerHTML =
      '<div class="ca-layout">' +
      '<div class="ca-left" id="ca-form-container"></div>' +
      '<div class="ca-right" id="ca-report-container"></div>' +
      "</div>";
  }

  function _initComponents() {
    AnalyzerForm.init("ca-form-container");
    AnalyzerReport.init("ca-report-container");

    AnalyzerForm.onAnalyze = _onAnalyze;
    AnalyzerReport.showEmpty();
  }

  // ═══════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════

  function _loadData() {
    Promise.all([_fetchCharacters(), _fetchChapters(), _fetchRelations()])
      .then(function (_ref) {
        var chars = _ref[0], chapters = _ref[1], rels = _ref[2];
        state.characters = chars;
        state.chapters = chapters;
        state.relations = rels;

        // Build lookup maps
        state.chapterMap = {};
        chapters.forEach(function (ch) { state.chapterMap[ch.id] = ch; });

        state.nameMap = {};
        chars.forEach(function (c) { state.nameMap[c.id] = c.name; });

        // Augment relations with names
        state.relations = rels.map(function (r) {
          return {
            id: r.id,
            relationType: r.relationType,
            sourceCharacterId: r.sourceCharacterId,
            targetCharacterId: r.targetCharacterId,
            otherName: r.sourceCharacterId === state.nameMap[r.targetCharacterId] ? state.nameMap[r.sourceCharacterId] : state.nameMap[r.targetCharacterId] || state.nameMap[r.targetCharacterId],
          };
        });

        AnalyzerForm.render(chars, chapters);
      })
      .catch(function (e) {
        container.innerHTML = '<div class="ca-empty"><div class="ca-empty-icon">❌</div><div class="ca-empty-text">加载失败: ' + _esc(e.message) + "</div></div>";
      });
  }

  function _fetchCharacters() {
    return fetch("/api/characters?projectId=" + encodeURIComponent(state.projectId) + "&limit=500")
      .then(function (r) { return r.json(); })
      .then(function (result) { return result.success ? result.data : []; });
  }

  function _fetchChapters() {
    // Get project chapters via the war-room API
    return fetch("/api/projects?projectId=" + encodeURIComponent(state.projectId))
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success || !result.data || result.data.length === 0) return [];
        var projectId = result.data[0].id;
        return fetch("/api/projects/" + projectId + "/volumes")
          .then(function (r) { return r.json(); })
          .then(function (volResult) {
            if (!volResult.success) return [];
            var chapters = [];
            volResult.data.forEach(function (vol) {
              (vol.chapters || []).forEach(function (ch) {
                chapters.push({
                  id: ch.id,
                  title: ch.title,
                  order: ch.order,
                  wordCount: ch.wordCount,
                });
              });
            });
            return chapters;
          });
      })
      .catch(function () { return []; });
  }

  function _fetchRelations() {
    return fetch("/api/relations?projectId=" + encodeURIComponent(state.projectId))
      .then(function (r) { return r.json(); })
      .then(function (result) { return result.success ? result.data : []; });
  }

  // ═══════════════════════════════════
  //  ANALYSIS
  // ═══════════════════════════════════

  function _onAnalyze(charId, chapterIds, categories) {
    var character = state.characters.find(function (c) { return c.id === charId; });
    if (!character) { LayoutSkill.showToast("角色未找到"); return; }

    // Get character relations
    var charRels = state.relations.filter(function (r) {
      return r.sourceCharacterId === charId || r.targetCharacterId === charId;
    }).map(function (r) {
      var otherId = r.sourceCharacterId === charId ? r.targetCharacterId : r.sourceCharacterId;
      return { relationType: r.relationType, otherName: state.nameMap[otherId] || otherId };
    });

    // Get chapter contents (from novelData in the page, or fetch from API)
    var chapters = chapterIds
      .map(function (id) {
        var ch = state.chapterMap[id];
        // Try to get content from globals
        var content = "";
        if (typeof chapterMap !== "undefined" && chapterMap[id]) {
          content = chapterMap[id].content || "";
        }
        return { id: id, title: ch ? ch.title : id, content: content };
      });

    // Try AI analysis first, fall back to demo
    AnalyzerService.analyze(character, charRels, chapters, categories)
      .then(function (result) {
        AnalyzerReport.show(character, result);
      })
      .catch(function (err) {
        console.warn("AI analysis failed, using demo:", err.message);
        var demoResult = AnalyzerService.generateDemo(character, charRels);
        AnalyzerReport.show(character, demoResult);
      })
      .finally(function () {
        AnalyzerForm.setLoading(false);
      });
  }

  // ═══════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════

  window.CharacterAnalyzer = {
    init: init,
    refresh: function () { _loadData(); AnalyzerReport.showEmpty(); },
    getState: function () { return state; },
  };
})();
