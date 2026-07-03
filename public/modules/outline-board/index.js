/* ================================================================
   Outline Board Module — 大纲面板
   Tree · Kanban · Timeline 三视图 + 拖拽排序 + 快速创建
   Exposed as window.OutlineBoard
   ================================================================ */

(function () {
  var state = {
    projectId: "proj_demo",
    currentStoryId: null,
    currentView: "tree",   // "tree" | "kanban" | "timeline"
    treeData: null,
    stories: [],
    charNames: {},         // id → name (from Character Skill)
    locNames: {},          // id → name (from World Skill)
    facNames: {},          // id → name (from World Skill)
  };

  var container = null;

  // ═══════════════════════════════════
  //  INIT
  // ═══════════════════════════════════

  function init(containerId, projectId) {
    try {
      container = document.getElementById(containerId);
      if (!container) { console.error("OutlineBoard: container not found"); return; }
      container.innerHTML = '<div style="padding:40px;color:#d4a574;text-align:center"><p>📋 大纲面板加载中…</p></div>';

      state.projectId = projectId || "proj_demo";
      _renderLayout();
      _initComponents();
      _loadStories();
    } catch (e) {
      console.error("OutlineBoard init error:", e.message);
      container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>大纲面板初始化错误</h3><pre>' + e.message + "</pre></div>";
    }
  }

  // ═══════════════════════════════════
  //  LAYOUT
  // ═══════════════════════════════════

  function _renderLayout() {
    container.innerHTML =
      '<div class="ob-layout">' +
      '<div class="ob-topbar">' +
      '<div class="ob-view-tabs">' +
      '<button class="ob-view-tab active" data-view="tree">🌳 树形</button>' +
      '<button class="ob-view-tab" data-view="kanban">📋 看板</button>' +
      '<button class="ob-view-tab" data-view="timeline">📅 时间线</button>' +
      "</div>" +
      '<select class="ob-story-select" id="ob-story-select"></select>' +
      '<button class="ob-quick-create" id="ob-quick-create-btn">+ 快速创建</button>' +
      "</div>" +
      '<div class="ob-content" id="ob-content-area"></div>' +
      "</div>";

    _bindTopbar();
  }

  function _initComponents() {
    TreeView.init("ob-content-area");
    KanbanView.init("ob-content-area");
    TimelineView.init("ob-content-area");
    QuickCreate.init("ob-content-area");
  }

  // ═══════════════════════════════════
  //  TOPBAR
  // ═══════════════════════════════════

  function _bindTopbar() {
    var self = this;
    // View tabs
    document.querySelector(".ob-view-tabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".ob-view-tab");
      if (!tab) return;
      document.querySelectorAll(".ob-view-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      state.currentView = tab.getAttribute("data-view");
      _renderCurrentView();
    });

    // Story select
    var sel = document.getElementById("ob-story-select");
    if (sel) {
      sel.addEventListener("change", function () {
        state.currentStoryId = this.value;
        if (state.currentStoryId) _loadTree();
        else _showEmpty("请创建一个故事开始");
      });
    }

    // Quick create
    var qcBtn = document.getElementById("ob-quick-create-btn");
    if (qcBtn) {
      qcBtn.addEventListener("click", function () {
        if (!state.currentStoryId) { LayoutSkill.showToast("请先创建一个故事"); return; }
        _openQuickCreate("volume", { storyId: state.currentStoryId });
      });
    }
  }

  // ═══════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════

  function _loadStories() {
    BoardService.listStories(state.projectId).then(function (result) {
      if (!result.success) { _showEmpty("加载失败: " + result.error); return; }
      state.stories = result.data || [];

      var sel = document.getElementById("ob-story-select");
      if (sel) {
        if (state.stories.length === 0) {
          sel.innerHTML = '<option value="">-- 无故事，请先创建 --</option>';
          _showEmpty("还没有故事<br><small>点击「+ 快速创建」创建第一卷</small>");
        } else {
          sel.innerHTML = state.stories.map(function (s) {
            return '<option value="' + s.id + '">' + _esc(s.title) + '</option>';
          }).join("");
          state.currentStoryId = state.stories[0].id;
          _loadTree();
        }
      }
    });
  }

  function _loadTree() {
    if (!state.currentStoryId) return;
    BoardService.getTree(state.currentStoryId).then(function (result) {
      if (!result.success) { _showEmpty("加载大纲失败"); return; }
      state.treeData = result.data;
      _loadEntityNames(); // Load character/location/faction names in background
      _renderCurrentView();
    });
  }

  function _loadEntityNames() {
    // Load character names
    fetch("/api/characters?projectId=" + state.projectId + "&limit=500")
      .then(function (r) { return r.json(); })
      .then(function (r) { if (r.success) r.data.forEach(function (c) { state.charNames[c.id] = c.name; }); })
      .catch(function () {});

    // Load location names
    fetch("/api/world/locations?projectId=" + state.projectId)
      .then(function (r) { return r.json(); })
      .then(function (r) { if (r.success && r.data) r.data.forEach(function (l) { state.locNames[l.id] = l.name; }); })
      .catch(function () {});

    // Load faction names
    fetch("/api/world/factions?projectId=" + state.projectId)
      .then(function (r) { return r.json(); })
      .then(function (r) { if (r.success && r.data) r.data.forEach(function (f) { state.facNames[f.id] = f.name; }); })
      .catch(function () {});
  }

  // ═══════════════════════════════════
  //  VIEW RENDERING
  // ═══════════════════════════════════

  function _renderCurrentView() {
    if (!state.treeData) { _showEmpty("暂无数据"); return; }

    switch (state.currentView) {
      case "tree": TreeView.render(state.treeData); break;
      case "kanban": KanbanView.render(state.treeData); break;
      case "timeline": TimelineView.render(state.treeData); break;
    }

    // Re-bind refresh callbacks
    TreeView.onRefresh = _onDragDrop;
    KanbanView.onRefresh = function () { _loadTree(); };
  }

  // ═══════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════

  function _openQuickCreate(type, ctx) {
    QuickCreate.open(type, ctx).then(function (result) {
      if (!result) return;
      var createFn;
      switch (result.type) {
        case "volume": createFn = BoardService.createVolume; break;
        case "chapter": createFn = BoardService.createChapter; break;
        case "scene": createFn = BoardService.createScene; break;
      }
      if (!createFn) return;
      createFn(result.data).then(function (r) {
        if (r.success) { LayoutSkill.showToast("已创建"); _loadTree(); }
        else LayoutSkill.showToast("创建失败: " + r.error);
      });
    });
  }

  function _deleteEntity(type, id) {
    if (!confirm("确定要删除吗？此操作不可撤销。")) return;
    var deleteFn;
    switch (type) {
      case "volume": deleteFn = BoardService.deleteVolume; break;
      case "chapter": deleteFn = BoardService.deleteChapter; break;
      case "scene": deleteFn = BoardService.deleteScene; break;
    }
    if (!deleteFn) return;
    deleteFn(id).then(function (r) {
      if (r.success) { LayoutSkill.showToast("已删除"); _loadTree(); }
      else LayoutSkill.showToast("删除失败: " + r.error);
    });
  }

  function _onDragDrop(dragData, targetId, targetType) {
    // Determine reorder endpoint based on drag type
    var reorderFn, listFn, parentField;
    if (dragData.type === "volume") {
      reorderFn = function (id, order) { return fetch("/api/outline/volumes/" + id + "/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOrder: order }) }).then(function (r) { return r.json(); }); };
    } else if (dragData.type === "chapter") {
      reorderFn = function (id, order, pid) { return fetch("/api/outline/chapters/" + id + "/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOrder: order, newParentId: pid }) }).then(function (r) { return r.json(); }); };
    } else if (dragData.type === "scene") {
      reorderFn = function (id, order, pid) { return fetch("/api/outline/scenes/" + id + "/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newOrder: order, newParentId: pid }) }).then(function (r) { return r.json(); }); };
    }
    if (!reorderFn) return;

    // Find target order
    var targetOrder = 0;
    if (targetType === "volume") {
      var vols = state.treeData.volumes || [];
      targetOrder = vols.findIndex(function (v) { return v.id === targetId; });
    }

    var parentId;
    if (dragData.type === "chapter") {
      // Find which volume the target chapter is in
      (state.treeData.volumes || []).forEach(function (vol) {
        (vol.chapters || []).forEach(function (ch, i) {
          if (ch.id === targetId) { parentId = vol.id; targetOrder = i; }
        });
      });
    }
    if (dragData.type === "scene") {
      (state.treeData.volumes || []).forEach(function (vol) {
        (vol.chapters || []).forEach(function (ch) {
          (ch.scenes || []).forEach(function (sc, i) {
            if (sc.id === targetId) { parentId = ch.id; targetOrder = i; }
          });
        });
      });
    }

    reorderFn(dragData.id, targetOrder, parentId).then(function (r) {
      if (r.success) { LayoutSkill.showToast("已排序"); _loadTree(); }
      else LayoutSkill.showToast("排序失败: " + r.error);
    });
  }

  function _showEmpty(msg) {
    var contentEl = document.getElementById("ob-content-area");
    if (contentEl) {
      contentEl.innerHTML = '<div class="ob-empty"><div class="ob-empty-icon">📋</div><div class="ob-empty-text">' + (msg || "暂无数据") + '</div></div>';
    }
  }

  // ═══════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════

  window.OutlineBoard = {
    init: init,
    refresh: function () { _loadStories(); },
    _openQuickCreate: _openQuickCreate,
    _deleteEntity: _deleteEntity,
    getState: function () { return state; },
  };
})();
