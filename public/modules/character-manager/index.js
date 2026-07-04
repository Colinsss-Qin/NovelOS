/* ================================================================
   Character Manager Module — 人物（角色列表 + 关系图谱）
   Layout: 子 tab 切换 → 左侧列表 + 右侧详情 / 全宽图谱
   Data via REST API: /api/characters + /api/relations
   Exposed as window.CharacterManager
   ================================================================ */

(function () {
  var state = {
    projectId: null,
    view: "list",      // "list" | "detail" | "editor"
    subView: "list",   // "list" | "graph"
    characters: [],
    activeChar: null,
    relations: [],
    charNameMap: {},   // id → name for relation display
    graphRoot: null,   // React root for the graph sub-view
  };

  var container = null;

  // ═══════════════════════════════════
  //  INIT
  // ═══════════════════════════════════

  function init(containerId, projectId) {
    try {
      container = document.getElementById(containerId);
      if (!container) { console.error("CharacterManager: container not found"); return; }
      container.innerHTML = '<div style="padding:40px;color:#d4a574;text-align:center"><p>👤 人物加载中…</p></div>';

      state.projectId = projectId || null;
      _renderLayout();
      _initComponents();
      _loadCharacters();
    } catch (e) {
      console.error("CharacterManager init error:", e.message, e.stack);
      container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>人物模块初始化错误</h3><pre>' + e.message + "</pre></div>";
    }
  }

  // ═══════════════════════════════════
  //  LAYOUT
  // ═══════════════════════════════════

  function _renderLayout() {
    container.innerHTML =
      '<div class="cm-sub-tabs">' +
      '<button class="cm-sub-tab active" data-sub="list">👤 角色列表</button>' +
      '<button class="cm-sub-tab" data-sub="graph">🔗 关系图谱</button>' +
      '<button class="cm-sub-tab" data-sub="analyzer">🔍 角色分析</button>' +
      '</div>' +
      '<div class="cm-sub-content" id="cm-sub-content"></div>';

    // Sub-tab click handlers
    var self = this;
    container.querySelectorAll(".cm-sub-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sub = this.getAttribute("data-sub");
        _switchSubView(sub);
      });
    });
  }

  function _switchSubView(sub) {
    state.subView = sub;
    // Update active sub-tab
    container.querySelectorAll(".cm-sub-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-sub") === sub);
    });

    if (sub === "list") {
      _renderListView();
    } else if (sub === "graph") {
      _renderGraphView();
    } else if (sub === "analyzer") {
      _renderAnalyzerView();
    }
  }

  function _renderListView() {
    var content = document.getElementById("cm-sub-content");
    if (!content) return;
    content.innerHTML =
      '<div class="cm-layout">' +
      '<div class="cm-left">' +
      '<div id="cm-search-bar"></div>' +
      '<button class="cm-create-btn" id="cm-create-btn">+ 新建角色</button>' +
      '<div id="cm-char-list"></div>' +
      "</div>" +
      '<div class="cm-right" id="cm-right-panel"></div>' +
      "</div>";

    _initListComponents();

    // Restore list state
    if (state.characters.length) {
      CharList.setItems(state.characters);
      if (state.activeChar) CharList.setActive(state.activeChar.id);
    }
    if (state.view === "detail" && state.activeChar) {
      CharDetail.show(state.activeChar, state.relations);
    } else if (state.view === "editor" && state.activeChar) {
      CharEditor.showEdit(state.activeChar);
    } else if (state.view === "list") {
      CharDetail.showEmpty();
    }
  }

  function _renderGraphView() {
    var content = document.getElementById("cm-sub-content");
    if (!content) return;
    content.innerHTML = '<div id="cm-graph-container" style="width:100%;height:100%"></div>';

    // Create React root for graph
    var graphEl = document.getElementById("cm-graph-container");
    if (graphEl && window.ReactDOM) {
      state.graphRoot = ReactDOM.createRoot(graphEl);
      _renderGraph();
    }
  }

  function _renderGraph() {
    if (!state.graphRoot) return;

    if (state.characters.length === 0) {
      state.graphRoot.render(
        React.createElement("div", {
          style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#3a3750", gap: "10px" }
        },
          React.createElement("div", { style: { fontSize: "48px" } }, "🔗"),
          React.createElement("div", { style: { fontSize: "13px" } }, "暂无角色数据，请先在「角色列表」中创建角色")
        )
      );
      return;
    }

    if (window.CharacterGraphComponent) {
      state.graphRoot.render(React.createElement(CharacterGraphComponent));
      // Feed data to graph after render
      setTimeout(function () {
        if (window._cgSetData) {
          window._cgSetData(state.characters, state.relations);
        }
      }, 100);
    }
  }

  function _initListComponents() {
    // Re-init list components into new DOM elements
    CharSearch.init("cm-search-bar");
    CharList.init("cm-char-list");
    CharDetail.init("cm-right-panel");
    CharEditor.init("cm-right-panel");

    CharSearch.onSearch = _onSearch;
    CharSearch.onFilter = _onSearch;
    CharList.onSelect = _onSelectChar;
    CharDetail.onEdit = _onEditChar;
    CharDetail.onDelete = _onDeleteChar;
    CharEditor.onSave = _onSaveChar;
    CharEditor.onCancel = _onCancelEdit;

    document.getElementById("cm-create-btn").addEventListener("click", function () {
      CharEditor.showCreate({});
      state.view = "editor";
    });
  }

  function _initComponents() {
    // Initial setup — delegate to list view rendering
    _renderListView();
  }

  // ═══════════════════════════════════
  //  ANALYZER SUB-VIEW
  // ═══════════════════════════════════

  function _renderAnalyzerView() {
    var content = document.getElementById("cm-sub-content");
    if (!content) return;
    content.innerHTML =
      '<div class="cm-layout">' +
      '<div class="cm-left" id="cm-analyzer-form"></div>' +
      '<div class="cm-right" id="cm-analyzer-report"></div>' +
      '</div>';

    _initAnalyzerComponents();
  }

  function _initAnalyzerComponents() {
    if (typeof AnalyzerForm === "undefined" || typeof AnalyzerReport === "undefined") {
      var content = document.getElementById("cm-sub-content");
      if (content) content.innerHTML = '<div style="padding:40px;color:#c06060;text-align:center"><p>角色分析组件未加载</p></div>';
      return;
    }

    AnalyzerForm.init("cm-analyzer-form");
    AnalyzerReport.init("cm-analyzer-report");
    AnalyzerReport.showEmpty();

    AnalyzerForm.onAnalyze = function (charId, chapterIds, categories) {
      var character = state.characters.find(function (c) { return c.id === charId; });
      if (!character) { LayoutSkill.showToast("未找到角色"); return; }

      var relevantRelations = (state.relations || []).filter(function (r) {
        return r.characterAId === charId || r.characterBId === charId;
      });

      AnalyzerForm.setLoading(true);
      var analysisResult = AnalyzerService.generateDemo(character, categories);
      AnalyzerReport.render(character, analysisResult);
      AnalyzerForm.setLoading(false);
    };

    // Load chapters for the analyzer, then render form with both chars and chapters
    _loadChaptersForAnalyzer(function (chapters) {
      AnalyzerForm.render(state.characters, chapters);
    });
  }

  function _loadChaptersForAnalyzer(callback) {
    if (typeof AnalyzerForm === "undefined") return;
    fetch("/api/projects/" + encodeURIComponent(state.projectId) + "/volumes")
      .then(function (r) { return r.json(); })
      .then(function (result) {
        var chapters = [];
        if (result.success && result.data) {
          result.data.forEach(function (vol) {
            (vol.chapters || []).forEach(function (ch) {
              chapters.push({ id: ch.id, title: ch.title, order: ch.order, wordCount: ch.wordCount });
            });
          });
        }
        if (callback) callback(chapters);
      })
      .catch(function () {
        if (callback) callback([]);
      });
  }

  // ═══════════════════════════════════
  //  DATA
  // ═══════════════════════════════════

  function _loadCharacters() {
    var filter = state.subView === "list" ? CharSearch.getState() : {};
    var params = "projectId=" + encodeURIComponent(state.projectId);
    if (filter.query) params += "&search=" + encodeURIComponent(filter.query);
    if (filter.status) params += "&status=" + encodeURIComponent(filter.status);
    if (filter.gender) params += "&gender=" + encodeURIComponent(filter.gender);

    fetch("/api/characters?" + params)
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) { LayoutSkill.showToast("加载失败: " + result.error); return; }
        state.characters = result.data;
        state.charNameMap = {};
        result.data.forEach(function (c) { state.charNameMap[c.id] = c.name; });

        // Also load all relations for graph usage
        _loadAllRelations();

        // Update list view if visible
        if (state.subView === "list") {
          CharList.setItems(result.data);
          if (state.activeChar) CharList.setActive(state.activeChar.id);
        }
      })
      .catch(function (e) { LayoutSkill.showToast("网络错误: " + e.message); });
  }

  function _loadAllRelations() {
    fetch("/api/relations?projectId=" + encodeURIComponent(state.projectId))
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) return;
        state.relations = result.data;
      });
  }

  function _loadRelations(charId) {
    fetch("/api/relations?projectId=" + state.projectId + "&characterId=" + charId)
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) return;
        state.relations = result.data;
        if (state.view === "detail" && state.activeChar) {
          CharDetail.show(state.activeChar, state.relations);
        }
      });
  }

  // ═══════════════════════════════════
  //  EVENT HANDLERS
  // ═══════════════════════════════════

  function _onSearch(query, status, gender) {
    _loadCharacters();
  }

  function _onSelectChar(id) {
    var found = state.characters.find(function (c) { return c.id === id; });
    if (!found) return;
    state.activeChar = found;
    state.view = "detail";
    CharDetail.show(found, []);
    CharList.setActive(id);
    _loadRelations(id);
  }

  function _onEditChar() {
    if (!state.activeChar) return;
    state.view = "editor";
    CharEditor.showEdit(state.activeChar);
  }

  function _onDeleteChar() {
    if (!state.activeChar) return;
    if (!confirm("确定要删除「" + state.activeChar.name + "」吗？此操作不可撤销。")) return;

    fetch("/api/characters/" + state.activeChar.id, { method: "DELETE" })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) { LayoutSkill.showToast("删除失败: " + result.error); return; }
        LayoutSkill.showToast("已删除");
        state.activeChar = null;
        state.view = "list";
        CharDetail.showEmpty();
        _loadCharacters();
      });
  }

  function _onSaveChar(data) {
    if (!data.name || !data.name.trim()) {
      LayoutSkill.showToast("角色姓名不能为空");
      return;
    }

    var isCreate = !state.activeChar || CharEditor.mode === "create";
    var url = isCreate ? "/api/characters" : "/api/characters/" + state.activeChar.id;
    var method = isCreate ? "POST" : "PUT";

    if (isCreate) data.projectId = state.projectId;

    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) { LayoutSkill.showToast("保存失败: " + result.error); return; }
        LayoutSkill.showToast(isCreate ? "角色已创建" : "已保存");
        state.activeChar = result.data;
        state.view = "detail";
        _loadCharacters();
        _loadRelations(result.data.id);
        CharDetail.show(result.data, []);
      });
  }

  function _onCancelEdit() {
    if (state.activeChar) {
      state.view = "detail";
      CharDetail.show(state.activeChar, state.relations);
    } else {
      state.view = "list";
      CharDetail.showEmpty();
    }
  }

  // ═══════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════

  window.CharacterManager = {
    init: init,
    refresh: function () { _loadCharacters(); },
    getState: function () { return state; },
  };
})();
