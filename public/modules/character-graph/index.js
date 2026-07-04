/* ================================================================
   Character Graph Module — React Flow 人物关系图
   React root mounted into vanilla JS container.
   Exposed as window.CharacterGraph
   ================================================================ */

(function () {
  var state = {
    projectId: null,
    characters: [],
    relations: [],
    root: null,
  };

  var container = null;

  // ═══════════════════════════════════
  //  INIT
  // ═══════════════════════════════════

  function init(containerId, projectId) {
    try {
      container = document.getElementById(containerId);
      if (!container) { console.error("CharacterGraph: container not found"); return; }

      state.projectId = projectId || null;

      // Create React root
      if (!state.root) {
        state.root = ReactDOM.createRoot(container);
      }
      _render();
      _loadData();
    } catch (e) {
      console.error("CharacterGraph init error:", e.message, e.stack);
      container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>关系图谱初始化错误</h3><pre>' + e.message + "</pre></div>";
    }
  }

  // ═══════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════

  function _render() {
    state.root.render(
      React.createElement(CharacterGraphComponent)
    );
  }

  // ═══════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════

  function _loadData() {
    Promise.all([_fetchCharacters(), _fetchRelations()])
      .then(function (_ref) {
        var chars = _ref[0], rels = _ref[1];
        state.characters = chars;
        state.relations = rels;

        if (chars.length === 0) {
          _showEmpty("暂无角色数据，请先在「人物管理」中创建角色");
          return;
        }

        if (window._cgSetData) {
          window._cgSetData(chars, rels);
        }
      })
      .catch(function (e) {
        _showEmpty("加载失败: " + e.message);
      });
  }

  function _fetchCharacters() {
    return fetch("/api/characters?projectId=" + encodeURIComponent(state.projectId) + "&limit=500")
      .then(function (r) { return r.json(); })
      .then(function (result) { return result.success ? result.data : []; });
  }

  function _fetchRelations() {
    return fetch("/api/relations?projectId=" + encodeURIComponent(state.projectId))
      .then(function (r) { return r.json(); })
      .then(function (result) { return result.success ? result.data : []; });
  }

  function _showEmpty(msg) {
    container.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#3a3750;gap:10px">' +
      '<div style="font-size:48px">🔗</div>' +
      '<div style="font-size:13px">' + (msg || "暂无数据") + "</div>" +
      "</div>";
  }

  // ═══════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════

  window.CharacterGraph = {
    init: init,
    refresh: function () {
      _render();
      _loadData();
    },
    getState: function () { return state; },
  };
})();
