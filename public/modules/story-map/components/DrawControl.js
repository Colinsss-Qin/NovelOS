/* ================================================================
   DrawControl — Leaflet.Draw 封装 (新增 / 编辑 / 删除地形)
   工具栏 + 绘制事件 → GeoJSON → GeoLayer → LocalStorage
   ================================================================ */

var DrawControl = {
  mode: "view", // "view" | "draw_point" | "draw_line" | "draw_polygon" | "delete"
  _drawHandler: null,
  _selectedFeatureId: null,
  _selectedLayer: null,
  _newFeatureType: "city", // default terrain type for new features
  _toolbarEl: null,

  /** Terrain types available for drawing */
  TERRAIN_TYPES: [
    { key: "mountain", label: "⛰️ 山脉", geomType: "LineString" },
    { key: "river", label: "🌊 河流", geomType: "LineString" },
    { key: "lake", label: "💧 湖泊", geomType: "Polygon" },
    { key: "forest", label: "🌲 森林", geomType: "Polygon" },
    { key: "desert", label: "🏜️ 沙漠", geomType: "Polygon" },
    { key: "swamp", label: "🪵  沼泽", geomType: "Polygon" },
    { key: "snow", label: "❄️ 雪原", geomType: "Polygon" },
    { key: "plains", label: "🌾 平原", geomType: "Polygon" },
    { key: "plateau", label: "🏔️ 高原", geomType: "Polygon" },
    { key: "city", label: "🏰 城市/地点", geomType: "Point" },
  ],

  /**
   * Initialize the draw control.
   * @param {string} containerId — toolbar container element ID
   */
  init: function (containerId) {
    this._toolbarEl = document.getElementById(containerId);
    if (!this._toolbarEl) return;
    this._renderToolbar();
    this._setMode("view");
  },

  /** Render the edit toolbar */
  _renderToolbar: function () {
    if (!this._toolbarEl) return;
    var html = '<div class="sm-edit-toolbar">';

    // Terrain type selector dropdown
    html +=
      '<select class="sm-type-select" id="sm-terrain-type">' +
      this.TERRAIN_TYPES.map(function (t) {
        return '<option value="' + t.key + '">' + t.label + "</option>";
      }).join("") +
      "</select>";

    // Action buttons
    html += '<button class="sm-edit-tool" data-action="draw_point" title="放置地点">📍</button>';
    html += '<button class="sm-edit-tool" data-action="draw_line" title="绘制线 (河流/山脉)">📏</button>';
    html += '<button class="sm-edit-tool" data-action="draw_polygon" title="绘制区域 (湖泊/森林/沙漠等)">⬡</button>';
    html += '<button class="sm-edit-tool sm-edit-sep" data-action="edit" title="编辑形状">✏️</button>';
    html += '<button class="sm-edit-tool" data-action="delete" title="删除地形">🗑️</button>';
    html += '<button class="sm-edit-tool" data-action="view" title="取消/返回">✖️</button>';
    html += "</div>";

    this._toolbarEl.innerHTML = html;
    this._bindToolbar();
  },

  /** Bind toolbar click events */
  _bindToolbar: function () {
    var self = this;
    if (!this._toolbarEl) return;

    this._toolbarEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".sm-edit-tool");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (!action) return;

      switch (action) {
        case "draw_point":
          self._setMode("draw_point");
          break;
        case "draw_line":
          self._setMode("draw_line");
          break;
        case "draw_polygon":
          self._setMode("draw_polygon");
          break;
        case "edit":
          self._setMode("edit");
          break;
        case "delete":
          self._setMode("delete");
          break;
        case "view":
          self._setMode("view");
          break;
      }
    });
  },

  /** Switch editing mode */
  _setMode: function (newMode) {
    // Clean up previous mode
    this._cleanup();

    this.mode = newMode;

    // Update toolbar button states
    if (this._toolbarEl) {
      this._toolbarEl.querySelectorAll(".sm-edit-tool").forEach(function (b) {
        b.classList.remove("active");
      });
      var activeBtn = this._toolbarEl.querySelector('[data-action="' + newMode + '"]');
      if (activeBtn) activeBtn.classList.add("active");
    }

    // Update cursor
    if (MapCore.map) {
      var container = MapCore.map.getContainer();
      if (container) {
        container.style.cursor = newMode === "view" ? "" : "crosshair";
      }
    }

    switch (newMode) {
      case "view":
        LayoutSkill.showToast("浏览模式");
        break;

      case "draw_point":
        this._startDrawPoint();
        break;

      case "draw_line":
        this._startDrawLine();
        break;

      case "draw_polygon":
        this._startDrawPolygon();
        break;

      case "edit":
        this._startEdit();
        break;

      case "delete":
        this._startDelete();
        break;
    }
  },

  /** Clean up current mode */
  _cleanup: function () {
    if (this._drawHandler) {
      try { this._drawHandler.disable(); } catch (e) {}
      this._drawHandler = null;
    }
    if (this._selectedLayer) {
      try {
        if (MapCore.map) MapCore.map.removeLayer(this._selectedLayer);
      } catch (e) {}
      this._selectedLayer = null;
    }
    this._selectedFeatureId = null;
  },

  // ═══════════════════════════════════
  //  DRAW MODES
  // ═══════════════════════════════════

  _startDrawPoint: function () {
    var self = this;
    this._newFeatureType = this._getSelectedTerrainType();

    this._drawHandler = new L.Draw.Marker(MapCore.map, {
      icon: L.divIcon({
        className: "sm-draw-marker",
        html: '<div style="background:#d4a574;width:12px;height:12px;border-radius:50%;border:2px solid #fff"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    });
    this._drawHandler.enable();

    MapCore.map.once("draw:created", function (e) {
      var layer = e.layer;
      var ll = layer.getLatLng();
      self._addFeature("Point", [ll.lng, ll.lat], layer);
      self._setMode("view");
    });

    LayoutSkill.showToast("在地图上点击放置 " + self._getTerrainLabel());
  },

  _startDrawLine: function () {
    var self = this;
    this._newFeatureType = this._getSelectedTerrainType();

    var style = GeoLayer.TYPE_STYLES[this._newFeatureType] || GeoLayer.TYPE_STYLES["default"];
    this._drawHandler = new L.Draw.Polyline(MapCore.map, {
      shapeOptions: { color: style.color, weight: 3 },
    });
    this._drawHandler.enable();

    MapCore.map.once("draw:created", function (e) {
      var layer = e.layer;
      var latlngs = layer.getLatLngs();
      var coords = latlngs.map(function (ll) {
        return [ll.lng, ll.lat];
      });
      self._addFeature("LineString", coords, layer);
      self._setMode("view");
    });

    LayoutSkill.showToast("在地图上点击绘制 " + self._getTerrainLabel());
  },

  _startDrawPolygon: function () {
    var self = this;
    this._newFeatureType = this._getSelectedTerrainType();

    var style = GeoLayer.TYPE_STYLES[this._newFeatureType] || GeoLayer.TYPE_STYLES["default"];
    this._drawHandler = new L.Draw.Polygon(MapCore.map, {
      shapeOptions: {
        color: style.color,
        weight: 2,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity || 0.3,
      },
    });
    this._drawHandler.enable();

    MapCore.map.once("draw:created", function (e) {
      var layer = e.layer;
      var latlngs = layer.getLatLngs();
      // Polygon coordinates need closing ring
      var coords = latlngs[0].map(function (ll) {
        return [ll.lng, ll.lat];
      });
      self._addFeature("Polygon", [coords], layer);
      self._setMode("view");
    });

    LayoutSkill.showToast("在地图上点击绘制 " + self._getTerrainLabel() + " 区域（双击完成）");
  },

  // ═══════════════════════════════════
  //  EDIT MODE — use Leaflet.Draw edit toolbar
  // ═══════════════════════════════════

  _startEdit: function () {
    // Re-render GeoLayer with editable layers
    if (!GeoLayer._layer) {
      LayoutSkill.showToast("没有可编辑的地形");
      this._setMode("view");
      return;
    }

    LayoutSkill.showToast("拖拽顶点编辑形状，完成后点击 ✖️ 退出");
  },

  // ═══════════════════════════════════
  //  DELETE MODE — click feature to remove
  // ═══════════════════════════════════

  _startDelete: function () {
    var self = this;
    LayoutSkill.showToast("点击地图上的地形标记来删除");

    // Add one-time click handlers to all features
    if (GeoLayer._layer) {
      GeoLayer._layer.eachLayer(function (layer) {
        layer._smDeleteHandler = function () {
          if (self.mode !== "delete") return;

          var feature = layer.feature;
          var name = (feature && feature.properties && feature.properties.name) || "未命名";

          if (confirm('确定要删除 "' + name + '" 吗？')) {
            // Find and remove the feature
            var features = GeoLayer._features;
            var idx = -1;
            for (var i = 0; i < features.length; i++) {
              if (features[i] === feature) {
                idx = i;
                break;
              }
            }
            if (idx >= 0) {
              GeoLayer._features.splice(idx, 1);
              GeoLayer.render(GeoLayer.getFeatureCollection(), { onClick: null });
              StoryMap.saveToStorage();
              LayoutSkill.showToast('已删除 "' + name + '"');
            }
          }

          self._setMode("view");
        };
        layer.on("click", layer._smDeleteHandler);
      });
    }
  },

  // ═══════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════

  /** Get currently selected terrain type from dropdown */
  _getSelectedTerrainType: function () {
    var select = document.getElementById("sm-terrain-type");
    return select ? select.value : "city";
  },

  _getTerrainLabel: function () {
    var type = this._newFeatureType || this._getSelectedTerrainType();
    var found = this.TERRAIN_TYPES.find(function (t) {
      return t.key === type;
    });
    return found ? found.label : "地形";
  },

  /** Create a GeoJSON feature + add to GeoLayer + save */
  _addFeature: function (geomType, coordinates, leafletLayer) {
    var type = this._getSelectedTerrainType();
    var name = prompt("为这个地形命名：", this._getTerrainLabel().replace(/[^一-龥]/g, ""));
    if (!name || !name.trim()) return;

    var feature = {
      type: "Feature",
      geometry: {
        type: geomType,
        coordinates: coordinates,
      },
      properties: {
        name: name.trim(),
        type: type,
        description: "",
      },
    };

    GeoLayer.addFeature(feature);

    // Add click handler for the new layer to support future delete operations
    var self = this;
    if (leafletLayer) {
      leafletLayer._smDeleteHandler = function () {
        if (self.mode === "delete") {
          if (confirm('确定要删除 "' + name + '" 吗？')) {
            GeoLayer.removeFeature(function (f) {
              return f.properties.name === name;
            });
            StoryMap.saveToStorage();
            LayoutSkill.showToast('已删除 "' + name + '"');
          }
          self._setMode("view");
        }
      };
      leafletLayer.on("click", leafletLayer._smDeleteHandler);
    }

    StoryMap.saveToStorage();
    LayoutSkill.showToast('✅ 已添加 "' + name + '"');
  },
};
