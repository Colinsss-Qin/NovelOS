/* CharList — character list with pagination */
var CharList = {
  el: null,
  characters: [],
  activeId: null,
  page: 1,
  pageSize: 15,
  onSelect: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  setItems: function (characters) {
    this.characters = characters || [];
    this.page = 1;
    this.render();
  },

  setActive: function (id) {
    this.activeId = id;
    this.render();
  },

  render: function () {
    if (!this.el) return;
    var self = this;
    var total = this.characters.length;
    var start = (this.page - 1) * this.pageSize;
    var pageItems = this.characters.slice(start, start + this.pageSize);
    var totalPages = Math.ceil(total / this.pageSize);

    if (total === 0) {
      this.el.innerHTML =
        '<div class="cm-empty">暂无角色<br><small>点击上方「+ 新建角色」开始</small></div>';
      return;
    }

    var html = '<div class="cm-list">';
    pageItems.forEach(function (c) {
      var statusClass = c.status || "active";
      var statusLabels = { active: "活跃", deceased: "已故", archived: "归档", suspended: "暂停" };
      var active = c.id === self.activeId ? " active" : "";
      html +=
        '<div class="cm-card' + active + '" data-id="' + c.id + '">' +
        '<div class="cm-card-name">' +
        _esc(c.name) +
        "</div>" +
        '<div class="cm-card-meta">' +
        '<span class="cm-card-status ' + statusClass + '"></span>' +
        (statusLabels[statusClass] || statusClass) +
        (c.gender ? ' <span>' + _esc(c.gender) + "</span>" : "") +
        (c.race !== "人类" ? ' <span>' + _esc(c.race) + "</span>" : "") +
        "</div>" +
        "</div>";
    });
    html += "</div>";

    if (totalPages > 1) {
      html += '<div class="cm-pagination">';
      html +=
        '<button class="cm-page-btn" ' + (self.page <= 1 ? "disabled" : "") +
        ' data-page="' + (self.page - 1) + '">‹</button>';
      html += '<span>' + self.page + " / " + totalPages + "</span>";
      html +=
        '<button class="cm-page-btn" ' + (self.page >= totalPages ? "disabled" : "") +
        ' data-page="' + (self.page + 1) + '">›</button>';
      html += "</div>";
    }

    this.el.innerHTML = html;

    // Bind card clicks
    this.el.querySelectorAll(".cm-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = this.getAttribute("data-id");
        self.setActive(id);
        if (self.onSelect) self.onSelect(id);
      });
    });

    // Bind pagination
    this.el.querySelectorAll(".cm-page-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = parseInt(this.getAttribute("data-page"));
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          self.page = p;
          self.render();
        }
      });
    });
  },
};
