/* ================================================================
   Story Map Module — 故事地图 (V1)
   2D 地图可视化：GeoJSON 渲染 + AI 文本/图片生成 + LocalStorage 持久化
   Exposed as window.StoryMap
   ================================================================ */

(function () {
  var state = {
    projectId: null,
    storageKey: "story-map-",
  };

  var container = null;

  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════

  function init(containerId, projectId) {
    try {
      container = document.getElementById(containerId);
      if (!container) {
        console.error("StoryMap: container #" + containerId + " not found");
        return;
      }

      state.projectId = projectId || null;
      state.storageKey = "story-map-" + state.projectId;

      // Show loading
      container.innerHTML =
        '<div style="padding:40px;color:#d4a574;text-align:center"><p>🗺️ 故事地图加载中…</p></div>';

      // Build layout
      _renderLayout();

      // Init sub-components
      MapCore.init("story-map-container");
      StylePanel.init("sm-basemap-bar");
      TextGenerator.init("sm-text-gen");
      ImageGenerator.init("sm-img-gen");
      DrawControl.init("sm-edit-tools");

      // Load saved data
      _loadFromStorage();

      console.log("StoryMap: init complete, projectId=" + state.projectId);
    } catch (e) {
      console.error("StoryMap init error:", e.message, e.stack);
      if (container) {
        container.innerHTML =
          '<div style="padding:40px;color:#c06060"><h3>故事地图初始化错误</h3><pre>' +
          e.message +
          "\n" +
          (e.stack || "") +
          "</pre></div>";
      }
    }
  }

  // ═══════════════════════════════════════
  //  LAYOUT — 四角分区 (左上:zoom 右上:编辑 左下:底图 右下:生成)
  // ═══════════════════════════════════════

  function _renderLayout() {
    container.innerHTML =
      '<div class="sm-layout">' +
      // ── 左侧面板（精简：图例 + 数据管理）──
      '<div class="sm-panel">' +
      '<div class="sm-panel-section">' +
      "<h3>📋 图例</h3>" +
      '<div class="sm-legend">' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#8B7355"></span>山脉</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#5B9BD5"></span>河流</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#4A90D9"></span>湖泊</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#5A8A5A"></span>森林</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#C4A35A"></span>沙漠</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#C8D8E8"></span>雪原</span>' +
      '<span class="sm-legend-item"><span class="sm-legend-dot" style="background:#C06060"></span>城市</span>' +
      "</div>" +
      "</div>" +
      '<div class="sm-panel-section">' +
      "<h3>💾 数据管理</h3>" +
      '<button class="sm-export-btn" id="sm-export-btn">📥 导出 GeoJSON</button>' +
      '<button class="sm-export-btn" id="sm-import-btn">📤 导入 GeoJSON</button>' +
      '<button class="sm-export-btn" id="sm-clear-btn" style="border-color:#5e3030;color:#c06060">🗑️ 清除全部</button>' +
      '<input type="file" accept=".json,.geojson" id="sm-import-input" style="display:none">' +
      "</div>" +
      "</div>" +
      // ── 地图区域（包含四角浮动控件）──
      '<div class="sm-map-wrap">' +
      '<div id="story-map-container"></div>' +
      // 右上角: 编辑工具栏
      '<div class="sm-edit-toolbar-wrap" id="sm-edit-tools"></div>' +
      // 左下角: 底图切换条
      '<div class="sm-basemap-bar" id="sm-basemap-bar"></div>' +
      // 右下角: AI 生成浮动按钮 + 弹出面板
      '<div class="sm-float-actions">' +
      '<button class="sm-float-btn" id="sm-flyout-text-btn" title="文本生成地图">📝</button>' +
      '<button class="sm-float-btn" id="sm-flyout-img-btn" title="上传图片生成">🖼️</button>' +
      "</div>" +
      // 文本生成弹出面板
      '<div class="sm-flyout-panel" id="sm-flyout-text-panel">' +
      '<button class="sm-flyout-close" id="sm-flyout-text-close">×</button>' +
      '<h3>📝 文本生成地图</h3>' +
      '<div id="sm-text-gen"></div>' +
      "</div>" +
      // 图片上传弹出面板
      '<div class="sm-flyout-panel" id="sm-flyout-img-panel">' +
      '<button class="sm-flyout-close" id="sm-flyout-img-close">×</button>' +
      '<h3>🖼️ 上传图片生成</h3>' +
      '<div id="sm-img-gen"></div>' +
      "</div>" +
      "</div>" +
      "</div>";

    _bindActions();
    _bindFlyouts();
  }

  // ═══════════════════════════════════════
  //  FLYOUT PANEL TOGGLE
  // ═══════════════════════════════════════

  function _bindFlyouts() {
    var textBtn = document.getElementById("sm-flyout-text-btn");
    var imgBtn = document.getElementById("sm-flyout-img-btn");
    var textPanel = document.getElementById("sm-flyout-text-panel");
    var imgPanel = document.getElementById("sm-flyout-img-panel");
    var textClose = document.getElementById("sm-flyout-text-close");
    var imgClose = document.getElementById("sm-flyout-img-close");

    function closeAll() {
      if (textPanel) textPanel.classList.remove("open");
      if (imgPanel) imgPanel.classList.remove("open");
      if (textBtn) textBtn.classList.remove("active");
      if (imgBtn) imgBtn.classList.remove("active");
    }

    if (textBtn && textPanel) {
      textBtn.addEventListener("click", function () {
        var isOpen = textPanel.classList.contains("open");
        closeAll();
        if (!isOpen) {
          textPanel.classList.add("open");
          textBtn.classList.add("active");
        }
      });
    }

    if (imgBtn && imgPanel) {
      imgBtn.addEventListener("click", function () {
        var isOpen = imgPanel.classList.contains("open");
        closeAll();
        if (!isOpen) {
          imgPanel.classList.add("open");
          imgBtn.classList.add("active");
        }
      });
    }

    if (textClose) textClose.addEventListener("click", closeAll);
    if (imgClose) imgClose.addEventListener("click", closeAll);

    // Click outside to close
    document.addEventListener("click", function (e) {
      if (textPanel && textPanel.classList.contains("open")) {
        if (!textPanel.contains(e.target) && e.target !== textBtn && !textBtn.contains(e.target)) {
          closeAll();
        }
      }
      if (imgPanel && imgPanel.classList.contains("open")) {
        if (!imgPanel.contains(e.target) && e.target !== imgBtn && !imgBtn.contains(e.target)) {
          closeAll();
        }
      }
    });
  }

  // ═══════════════════════════════════════
  //  DATA ACTIONS
  // ═══════════════════════════════════════

  function _bindActions() {
    // Export
    var exportBtn = document.getElementById("sm-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        var geojson = GeoLayer.getFeatureCollection();
        var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "story-map-" + state.projectId + ".geojson";
        a.click();
        URL.revokeObjectURL(url);
        LayoutSkill.showToast("✅ 已导出 " + geojson.features.length + " 个特征");
      });
    }

    // Import
    var importBtn = document.getElementById("sm-import-btn");
    var importInput = document.getElementById("sm-import-input");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", function () {
        importInput.click();
      });
      importInput.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var geojson = JSON.parse(ev.target.result);
            if (!geojson.features) throw new Error("Invalid GeoJSON");
            GeoLayer.render(geojson);
            StoryMap.saveToStorage();
            LayoutSkill.showToast("✅ 已导入 " + geojson.features.length + " 个特征");
          } catch (err) {
            LayoutSkill.showToast("❌ 文件格式错误: " + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Clear
    var clearBtn = document.getElementById("sm-clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (confirm("确定要清除所有地图数据吗？此操作不可撤销。")) {
          GeoLayer.render({ type: "FeatureCollection", features: [] });
          StoryMap.saveToStorage();
          LayoutSkill.showToast("已清除");
        }
      });
    }
  }

  // ═══════════════════════════════════════
  //  LOCAL STORAGE
  // ═══════════════════════════════════════

  function _loadFromStorage() {
    try {
      var raw = localStorage.getItem(state.storageKey);
      if (raw) {
        var geojson = JSON.parse(raw);
        if (geojson && geojson.features && geojson.features.length > 0) {
          GeoLayer.render(geojson);
          console.log("StoryMap: loaded " + geojson.features.length + " features from LocalStorage");
          return;
        }
      }
    } catch (e) {
      console.warn("StoryMap: failed to load from storage:", e.message);
    }

    // No saved data → start with empty map
    GeoLayer.render({ type: "FeatureCollection", features: [] });
  }

  // ═══════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════

  window.StoryMap = {
    init: init,
    refresh: function () {
      if (MapCore.map) MapCore.map.invalidateSize();
    },
    saveToStorage: function () {
      var geojson = GeoLayer.getFeatureCollection();
      try {
        localStorage.setItem(state.storageKey, JSON.stringify(geojson));
      } catch (e) {
        console.warn("StoryMap: failed to save to storage:", e.message);
      }
    },
    getState: function () {
      return state;
    },
  };
})();
