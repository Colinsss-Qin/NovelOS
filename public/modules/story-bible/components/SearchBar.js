/* SearchBar — debounced search input */
var SearchBar = {
  el: null,
  timer: null,
  onSearch: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;

    this.el.innerHTML =
      '<input type="text" class="sb-search-input" placeholder="🔍 搜索...">' +
      '<button class="sb-search-clear" style="display:none">×</button>';

    var input = this.el.querySelector(".sb-search-input");
    var clear = this.el.querySelector(".sb-search-clear");

    if (!input || !clear) {
      console.warn("SearchBar: failed to find expected child elements in #" + containerId);
      return;
    }

    input.addEventListener("input", function () {
      clear.style.display = this.value ? "block" : "none";
      clearTimeout(self.timer);
      self.timer = setTimeout(function () {
        if (self.onSearch) self.onSearch(input.value);
      }, 300);
    });

    clear.addEventListener("click", function () {
      input.value = "";
      clear.style.display = "none";
      if (self.onSearch) self.onSearch("");
    });
  },

  getValue: function () {
    if (!this.el) return "";
    var input = this.el.querySelector(".sb-search-input");
    return input ? input.value : "";
  },

  clear: function () {
    if (!this.el) return;
    var input = this.el.querySelector(".sb-search-input");
    var clear = this.el.querySelector(".sb-search-clear");
    if (input) input.value = "";
    if (clear) clear.style.display = "none";
  }
};
