/* ================================================================
   GeoLayer — GeoJSON rendering, style mapping per terrain type
   ================================================================ */

var GeoLayer = {
  _layer: null,
  _features: [],

  /** Type → Leaflet style mapping */
  TYPE_STYLES: {
    mountain: {
      color: "#8B7355",
      weight: 2,
      fillColor: "#8B7355",
      fillOpacity: 0.3,
      icon: "⛰️",
    },
    river: {
      color: "#5B9BD5",
      weight: 3,
      fillColor: "#5B9BD5",
      fillOpacity: 0.2,
      icon: "🌊",
    },
    lake: {
      color: "#4A90D9",
      weight: 2,
      fillColor: "#4A90D9",
      fillOpacity: 0.4,
      icon: "💧",
    },
    forest: {
      color: "#5A8A5A",
      weight: 1,
      fillColor: "#5A8A5A",
      fillOpacity: 0.25,
      icon: "🌲",
    },
    desert: {
      color: "#C4A35A",
      weight: 1,
      fillColor: "#C4A35A",
      fillOpacity: 0.25,
      icon: "🏜️",
    },
    swamp: {
      color: "#6B8A6B",
      weight: 1,
      fillColor: "#6B8A6B",
      fillOpacity: 0.35,
      icon: "🪵",
    },
    snow: {
      color: "#C8D8E8",
      weight: 1,
      fillColor: "#E8F0F8",
      fillOpacity: 0.4,
      icon: "❄️",
    },
    city: {
      color: "#C06060",
      weight: 1,
      fillColor: "#C06060",
      fillOpacity: 0.5,
      radius: 8,
      icon: "🏰",
    },
    plains: {
      color: "#8A9A5A",
      weight: 1,
      fillColor: "#8A9A5A",
      fillOpacity: 0.15,
      icon: "🌾",
    },
    plateau: {
      color: "#A08060",
      weight: 2,
      fillColor: "#A08060",
      fillOpacity: 0.2,
      icon: "🏔️",
    },
    default: {
      color: "#d4a574",
      weight: 2,
      fillColor: "#d4a574",
      fillOpacity: 0.2,
      icon: "📍",
    },
  },

  /**
   * Get style for a feature based on its properties.type
   */
  getFeatureType: function (feature) {
    var props = (feature && feature.properties) || {};
    return (props.type || props.terrainType || "default").toLowerCase();
  },

  getStyle: function (feature) {
    var type = this.getFeatureType(feature);
    return this.TYPE_STYLES[type] || this.TYPE_STYLES["default"];
  },

  /**
   * Add / replace GeoJSON layer on the map.
   * @param {object} geojson — GeoJSON FeatureCollection
   * @param {object} callbacks — { onClick(feature) }
   */
  render: function (geojson, callbacks) {
    if (!MapCore.map) return;

    // Remove existing
    if (this._layer) {
      MapCore.map.removeLayer(this._layer);
    }

    this._features = (geojson && geojson.features) ? geojson.features.slice() : [];

    if (this._features.length === 0) return;

    var self = this;

    this._layer = L.geoJSON(geojson, {
      pointToLayer: function (feature, latlng) {
        var style = self.getStyle(feature);
        return L.circleMarker(latlng, {
          radius: style.radius || 8,
          fillColor: style.fillColor,
          color: style.color,
          weight: 2,
          fillOpacity: style.fillOpacity || 0.5,
        });
      },

      style: function (feature) {
        var s = self.getStyle(feature);
        return {
          color: s.color,
          weight: s.weight,
          fillColor: s.fillColor,
          fillOpacity: s.fillOpacity,
        };
      },

      onEachFeature: function (feature, layer) {
        // Store feature reference on the layer
        layer.feature = feature;

        // Popup
        var props = feature.properties || {};
        var name = props.name || props.title || "未命名";
        var type = props.type || "";
        var typeLabel = self.TYPE_STYLES[type] ? (self.TYPE_STYLES[type].icon + " " + type) : type;

        var popupHtml =
          '<div class="sm-popup-content">' +
          "<strong>" +
          _esc(name) +
          "</strong>" +
          (typeLabel ? ' <span style="font-size:10px;color:#6b6880">' + typeLabel + "</span>" : "") +
          (props.description ? "<p>" + _esc(props.description) + "</p>" : "") +
          "</div>";

        layer.bindPopup(popupHtml);

        // Click handler: check DrawControl mode for edit/delete actions
        layer.on("click", function () {
          if (typeof DrawControl !== "undefined") {
            if (DrawControl.mode === "delete") {
              if (confirm('确定要删除 "' + name + '" 吗？')) {
                var features = self._features;
                var idx = features.indexOf(feature);
                if (idx >= 0) {
                  self._features.splice(idx, 1);
                  self.render(self.getFeatureCollection());
                  StoryMap.saveToStorage();
                  LayoutSkill.showToast('已删除 "' + name + '"');
                }
              }
              DrawControl._setMode("view");
              return;
            }
          }
          // Normal click callback
          if (callbacks && callbacks.onClick) {
            callbacks.onClick(feature, layer);
          }
        });
      },
    });

    this._layer.addTo(MapCore.map);

    // Fit bounds if features exist
    try {
      var bounds = this._layer.getBounds();
      if (bounds.isValid()) {
        MapCore.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    } catch (e) {
      // OK if bounds can't be computed
    }
  },

  /** Get all features as a GeoJSON FeatureCollection */
  getFeatureCollection: function () {
    return {
      type: "FeatureCollection",
      features: this._features,
    };
  },

  /** Add a single feature */
  addFeature: function (feature) {
    this._features.push(feature);
    this.render(this.getFeatureCollection());
  },

  /** Remove a feature by index or matching predicate */
  removeFeature: function (predicate) {
    if (typeof predicate === "number") {
      this._features.splice(predicate, 1);
    } else if (typeof predicate === "function") {
      this._features = this._features.filter(function (f, i) {
        return !predicate(f, i);
      });
    }
    this.render(this.getFeatureCollection());
  },

  /** Update a single feature */
  updateFeature: function (index, updated) {
    if (index >= 0 && index < this._features.length) {
      this._features[index] = updated;
      this.render(this.getFeatureCollection());
    }
  },
};
