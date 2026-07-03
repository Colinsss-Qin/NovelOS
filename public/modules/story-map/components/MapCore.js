/* ================================================================
   MapCore — Leaflet map init, basemap switching, CRS setup
   ================================================================ */

var MapCore = {
  map: null,
  activeStyle: "fantasy",
  center: [0, 0],
  zoom: 4,

  /** Basemap tile layer definitions */
  basemaps: {
    fantasy: {
      icon: "🗺️",
      label: "奇幻",
      create: function () {
        return L.tileLayer("", { attribution: "" });
      },
    },
    topo: {
      icon: "⛰️",
      label: "地形",
      create: function () {
        return L.tileLayer(
          "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
          { attribution: "© OpenTopoMap", maxZoom: 17 }
        );
      },
    },
    satellite: {
      icon: "🛰️",
      label: "卫星",
      create: function () {
        return L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "© Esri", maxZoom: 18 }
        );
      },
    },
    admin: {
      icon: "🏛️",
      label: "行政",
      create: function () {
        return L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          { attribution: "© CartoDB", maxZoom: 19 }
        );
      },
    },
    street: {
      icon: "🛣️",
      label: "街道",
      create: function () {
        return L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          { attribution: "© OpenStreetMap", maxZoom: 19 }
        );
      },
    },
  },

  _currentTileLayer: null,

  /**
   * Initialize the Leaflet map.
   * @param {string} containerId
   */
  init: function (containerId) {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    this.map = L.map(containerId, {
      center: this.center,
      zoom: this.zoom,
      zoomControl: true,
      attributionControl: true,
      crs: L.CRS.Simple, // 扁平坐标系，适合虚构世界
    }).setView(this.center, this.zoom);

    // Initial basemap
    this.switchStyle("fantasy");

    // Fit to container
    var self = this;
    setTimeout(function () {
      self.map.invalidateSize();
    }, 200);
  },

  /**
   * Switch basemap style.
   * @param {string} styleKey — "fantasy" | "topo" | "satellite" | "admin" | "street"
   */
  switchStyle: function (styleKey) {
    if (!this.map) return;

    // Remove current tile layer
    if (this._currentTileLayer) {
      this.map.removeLayer(this._currentTileLayer);
    }

    var def = this.basemaps[styleKey];
    if (!def) {
      // Switch to Simple CRS for fantasy mode
      if (styleKey === "fantasy") {
        this._currentTileLayer = L.tileLayer("", { attribution: "" });
      }
      this.activeStyle = styleKey;
      return;
    }

    // Switch CRS based on style
    if (styleKey === "fantasy") {
      this.map.options.crs = L.CRS.Simple;
    } else {
      this.map.options.crs = L.CRS.EPSG3857;
    }

    this._currentTileLayer = def.create();
    this._currentTileLayer.addTo(this.map);
    this.activeStyle = styleKey;
  },

  /** Pan to coordinates */
  flyTo: function (latlng, zoom) {
    if (!this.map) return;
    this.map.flyTo(latlng, zoom || 8, { duration: 1 });
  },

  /** Get current map bounds as array */
  getBounds: function () {
    if (!this.map) return null;
    var b = this.map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
  },

  /** Destroy and recreate */
  reset: function () {
    if (!this.map) return;
    this.map.setView(this.center, this.zoom);
  },
};
