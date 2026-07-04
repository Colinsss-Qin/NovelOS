/* ================================================================
   Future Scene Module — 未来场景库
   window.FutureScene = { init, refresh, getState }
   ================================================================ */

(function () {
  "use strict";

  // Fallback escape (defined globally by story-bible, but ensure it exists)
  if (typeof window._esc === "undefined") {
    window._esc = function (s) {
      if (!s) return "";
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
  }
  var _esc = window._esc;

  // ── Private State ──
  var state = {
    projectId: null,
    view: "board",           // "board" | "inbox" | "timeline"
    scenes: [],              // All FutureScene items
    activeScene: null,       // Currently viewing/editing
    filter: { query: "", status: "", sceneType: "", importance: "" },
    sortBy: "updatedAt",
    sortOrder: "desc",
    // Cached entity name maps
    charNames: {},
    locNames: {},
    facNames: {},
    chapterNames: {},
    // Full chapter list for dropdown
    chapters: [],
  };

  var container = null;

  // ── Layout ──

  function _renderLayout() {
    if (!container) return;
    container.innerHTML =
      '<div class="fs-layout">' +
      '<div class="fs-topbar">' +
      '<div class="fs-view-tabs">' +
      '<button class="fs-view-tab active" data-view="board">📋 看板</button>' +
      '<button class="fs-view-tab" data-view="inbox">📥 列表</button>' +
      '<button class="fs-view-tab" data-view="timeline">📅 时间线</button>' +
      '</div>' +
      '<div id="fs-filter"></div>' +
      '<button class="fs-btn fs-btn-primary" id="fs-create-btn">+ 新建场景</button>' +
      '</div>' +
      '<div class="fs-content" id="fs-content-area"></div>' +
      '</div>';

    // Init sub-components
    FutureSceneFilter.init("fs-filter");
    FutureSceneBoard.init("fs-content-area");
    FutureSceneInbox.init("fs-content-area");
    FutureSceneTimeline.init("fs-content-area");

    _wireEvents();
  }

  function _wireEvents() {
    // View tabs
    container.querySelectorAll(".fs-view-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var view = this.getAttribute("data-view");
        _switchView(view);
      });
    });

    // Create button
    document.getElementById("fs-create-btn").addEventListener("click", function () {
      _openEditor(null);
    });

    // Filter callback
    FutureSceneFilter.onFilter = function (f) {
      state.filter = f;
      _loadScenes();
    };

    // Board: status change (drag-and-drop)
    FutureSceneBoard.onStatusChange = function (id, newStatus) {
      FutureSceneService.updateStatus(id, newStatus).then(function (r) {
        if (r.success) {
          LayoutSkill.showToast("已移至「" + newStatus + "」");
          _loadScenes();
        } else {
          LayoutSkill.showToast("更新失败: " + (r.error || "未知错误"));
        }
      }).catch(function (e) {
        LayoutSkill.showToast("网络错误: " + e.message);
      });
    };

    // Board: card click
    FutureSceneBoard.onCardClick = function (id) {
      _openEditor(id);
    };

    // Inbox: row click
    FutureSceneInbox.onSelect = function (id) {
      _openEditor(id);
    };

    // Inbox: sort change
    FutureSceneInbox.onSort = function (sortBy, sortOrder) {
      state.sortBy = sortBy;
      state.sortOrder = sortOrder;
      _loadScenes();
    };

    // Timeline: card click
    FutureSceneTimeline.onCardClick = function (id) {
      _openEditor(id);
    };
  }

  function _switchView(view) {
    state.view = view;
    container.querySelectorAll(".fs-view-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    _renderCurrentView();
  }

  function _renderCurrentView() {
    var contentEl = document.getElementById("fs-content-area");
    if (!contentEl) return;

    if (state.view === "board") {
      FutureSceneBoard.render(state.scenes);
    } else if (state.view === "inbox") {
      FutureSceneInbox.render(state.scenes, state.sortBy, state.sortOrder);
    } else if (state.view === "timeline") {
      // Timeline needs chapter-sorted data
      _loadTimeline();
    }
  }

  // ── Data Loading ──

  function _loadEntityNames() {
    var allCharIds = [];
    var allLocIds  = [];
    var allFacIds  = [];
    var allChIds   = [];

    state.scenes.forEach(function (s) {
      if (s.targetCharacters) Array.prototype.push.apply(allCharIds, s.targetCharacters);
      if (s.targetLocations)  Array.prototype.push.apply(allLocIds,  s.targetLocations);
      if (s.targetFactions)   Array.prototype.push.apply(allFacIds,  s.targetFactions);
      if (s.expectedChapterId) allChIds.push(s.expectedChapterId);
    });

    // Dedupe
    allCharIds = allCharIds.filter(function (v, i, a) { return a.indexOf(v) === i; });
    allLocIds  = allLocIds.filter(function (v, i, a)  { return a.indexOf(v) === i; });
    allFacIds  = allFacIds.filter(function (v, i, a)  { return a.indexOf(v) === i; });
    allChIds   = allChIds.filter(function (v, i, a)   { return a.indexOf(v) === i; });

    FutureSceneService.getEntityNames(state.projectId, allCharIds, allLocIds, allFacIds, allChIds).then(function (r) {
      if (r.success) {
        state.charNames    = r.data.characters || {};
        state.locNames     = r.data.locations  || {};
        state.facNames     = r.data.factions   || {};
        state.chapterNames = r.data.chapters   || {};
      }
    }).catch(function () {});
  }

  function _loadChapters() {
    // Load full chapter list for editor dropdowns
    fetch("/api/outline/chapters?projectId=" + encodeURIComponent(state.projectId))
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.success && result.data) {
          state.chapters = result.data;
        }
      })
      .catch(function () {});
  }

  function _loadScenes() {
    var params = { projectId: state.projectId };
    if (state.filter.query)      params.query      = state.filter.query;
    if (state.filter.status)     params.status     = state.filter.status;
    if (state.filter.sceneType)  params.sceneType  = state.filter.sceneType;
    if (state.filter.importance) params.importance = state.filter.importance;
    params.sortBy    = state.sortBy;
    params.sortOrder = state.sortOrder;

    FutureSceneService.list(params).then(function (r) {
      if (r.success) {
        state.scenes = r.data.items || [];
        _loadEntityNames();
        _renderCurrentView();
      } else {
        LayoutSkill.showToast("加载失败: " + (r.error || "未知错误"));
      }
    }).catch(function (e) {
      LayoutSkill.showToast("网络错误: " + e.message);
    });
  }

  function _loadTimeline() {
    FutureSceneService.getTimeline(state.projectId).then(function (r) {
      if (r.success) {
        // Also collect entity names from timeline data
        var allCharIds = [];
        var allLocIds  = [];
        var allFacIds  = [];
        var allChIds   = [];

        (r.data || []).forEach(function (s) {
          if (s.targetCharacters) Array.prototype.push.apply(allCharIds, s.targetCharacters);
          if (s.targetLocations)  Array.prototype.push.apply(allLocIds,  s.targetLocations);
          if (s.targetFactions)   Array.prototype.push.apply(allFacIds,  s.targetFactions);
          if (s.expectedChapterId) allChIds.push(s.expectedChapterId);
        });

        allCharIds = allCharIds.filter(function (v, i, a) { return a.indexOf(v) === i; });
        allLocIds  = allLocIds.filter(function (v, i, a)  { return a.indexOf(v) === i; });
        allFacIds  = allFacIds.filter(function (v, i, a)  { return a.indexOf(v) === i; });

        FutureSceneService.getEntityNames(state.projectId, allCharIds, allLocIds, allFacIds, allChIds).then(function (nr) {
          if (nr.success) {
            state.charNames    = nr.data.characters || {};
            state.locNames     = nr.data.locations  || {};
            state.facNames     = nr.data.factions   || {};
            state.chapterNames = nr.data.chapters   || {};
          }
          FutureSceneTimeline.render(r.data, state.chapterNames);
        }).catch(function () {
          FutureSceneTimeline.render(r.data, state.chapterNames);
        });
      } else {
        LayoutSkill.showToast("时间线加载失败: " + (r.error || "未知错误"));
      }
    }).catch(function (e) {
      LayoutSkill.showToast("网络错误: " + e.message);
    });
  }

  // ── Editor ──

  function _openEditor(sceneId) {
    if (sceneId) {
      // Find from cached scenes
      var s = null;
      for (var i = 0; i < state.scenes.length; i++) {
        if (state.scenes[i].id === sceneId) { s = state.scenes[i]; break; }
      }
      if (!s) {
        // Fetch from server
        FutureSceneService.get(sceneId).then(function (r) {
          if (r.success) _showEditor(r.data);
          else LayoutSkill.showToast("加载场景失败");
        }).catch(function (e) { LayoutSkill.showToast("网络错误: " + e.message); });
        return;
      }
      _showEditor(s);
    } else {
      _showEditor(null);
    }
  }

  function _showEditor(scene) {
    // Ensure chapters are loaded
    if (state.chapters.length === 0) {
      _loadChapters();
    }

    FutureSceneEditor.open(scene, state.charNames, state.locNames, state.facNames, state.chapterNames, state.chapters).then(function (data) {
      if (data === null) return; // Cancelled

      if (data._delete) {
        // Delete
        FutureSceneService.delete(scene.id).then(function (r) {
          if (r.success) {
            LayoutSkill.showToast("场景已删除");
            _loadScenes();
          } else {
            LayoutSkill.showToast("删除失败: " + (r.error || "未知错误"));
          }
        }).catch(function (e) { LayoutSkill.showToast("网络错误: " + e.message); });
        return;
      }

      if (scene) {
        // Update
        FutureSceneService.update(scene.id, data).then(function (r) {
          if (r.success) {
            LayoutSkill.showToast("场景已更新");
            _loadScenes();
          } else {
            LayoutSkill.showToast("更新失败: " + (r.error || "未知错误"));
          }
        }).catch(function (e) { LayoutSkill.showToast("网络错误: " + e.message); });
      } else {
        // Create
        data.projectId = state.projectId;
        FutureSceneService.create(data).then(function (r) {
          if (r.success) {
            LayoutSkill.showToast("场景「" + data.title + "」已创建");
            _loadScenes();
          } else {
            LayoutSkill.showToast("创建失败: " + (r.error || "未知错误"));
          }
        }).catch(function (e) { LayoutSkill.showToast("网络错误: " + e.message); });
      }
    });
  }

  // ── Public API ──

  window.FutureScene = {
    init: function (containerId, projectId) {
      try {
        container = document.getElementById(containerId);
        if (!container) {
          console.error("FutureScene: container #" + containerId + " not found");
          return;
        }
        state.projectId = projectId || null;

        // Show loading
        container.innerHTML = '<div class="fs-loading">⏳ 加载未来场景库...</div>';

        _renderLayout();
        _loadChapters();
        _loadScenes();
      } catch (e) {
        if (container) {
          container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>初始化错误</h3><pre>' + e.message + '</pre></div>';
        }
        console.error("FutureScene init error:", e);
      }
    },

    refresh: function () {
      if (!container) return;
      _loadScenes();
    },

    getState: function () {
      return state;
    },
  };

})();
