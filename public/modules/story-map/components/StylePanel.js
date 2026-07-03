/* ================================================================
   StylePanel — basemap toggle bar (左下角水平条)
   ================================================================ */

var StylePanel = {
  el: null,
  activeStyle: "fantasy",

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    this.render();
    this._bind();
  },

  render: function () {
    if (!this.el) return;
    var styles = MapCore.basemaps;
    var html = "";
    Object.keys(styles).forEach(function (key) {
      var active = key === StylePanel.activeStyle ? " active" : "";
      html +=
        '<button class="sm-basemap-btn' +
        active +
        '" data-style="' +
        key +
        '">' +
        (styles[key].icon || "") +
        " " +
        styles[key].label +
        "</button>";
    });
    this.el.innerHTML = html;
  },

  _bind: function () {
    var self = this;
    if (!this.el) return;
    this.el.addEventListener("click", function (e) {
      var btn = e.target.closest(".sm-basemap-btn");
      if (!btn) return;
      var style = btn.getAttribute("data-style");
      self.setStyle(style);
    });
  },

  setStyle: function (styleKey) {
    this.activeStyle = styleKey;
    MapCore.switchStyle(styleKey);
    this.render();
    this._bind();
  },
};
