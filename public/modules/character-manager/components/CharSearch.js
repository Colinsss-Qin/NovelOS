/* CharSearch — search bar + status/gender filter */
var CharSearch = {
  el: null,
  onSearch: null,
  onFilter: null,
  query: "",
  statusFilter: "",
  genderFilter: "",

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    this.render();
    this._bind();
  },

  render: function () {
    if (!this.el) return;
    this.el.innerHTML =
      '<input type="text" class="cm-search-input" id="cm-search-input" placeholder="🔍 搜索角色…">' +
      '<select class="cm-filter-select" id="cm-filter-status">' +
      '<option value="">全部状态</option>' +
      '<option value="active">活跃</option>' +
      '<option value="deceased">已故</option>' +
      '<option value="archived">归档</option>' +
      '<option value="suspended">暂停</option>' +
      "</select>" +
      '<select class="cm-filter-select" id="cm-filter-gender">' +
      '<option value="">全部性别</option>' +
      '<option value="男">男</option>' +
      '<option value="女">女</option>' +
      '<option value="其他">其他</option>' +
      '<option value="未知">未知</option>' +
      "</select>";
  },

  _bind: function () {
    var self = this;
    var input = document.getElementById("cm-search-input");
    var statusSel = document.getElementById("cm-filter-status");
    var genderSel = document.getElementById("cm-filter-gender");

    if (input) {
      input.addEventListener("input", function () {
        self.query = this.value;
        if (self.onSearch) self.onSearch(self.query, self.statusFilter, self.genderFilter);
      });
    }
    if (statusSel) {
      statusSel.addEventListener("change", function () {
        self.statusFilter = this.value;
        if (self.onFilter) self.onFilter(self.query, self.statusFilter, self.genderFilter);
      });
    }
    if (genderSel) {
      genderSel.addEventListener("change", function () {
        self.genderFilter = this.value;
        if (self.onFilter) self.onFilter(self.query, self.statusFilter, self.genderFilter);
      });
    }
  },

  getState: function () {
    return { query: this.query, status: this.statusFilter, gender: this.genderFilter };
  },

  clear: function () {
    this.query = "";
    this.statusFilter = "";
    this.genderFilter = "";
    var input = document.getElementById("cm-search-input");
    if (input) input.value = "";
  },
};
