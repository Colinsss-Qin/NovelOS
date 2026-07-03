/* ItemList — paginated list container */
var ItemList = {
  el: null,
  items: [],
  activeId: null,
  page: 1,
  pageSize: 20,
  onSelect: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  /** @param {object[]} items */
  setItems: function (items) {
    this.items = items || [];
    this.page = 1;
    this.render();
  },

  setActive: function (id) {
    this.activeId = id;
    this.render();
  },

  render: function () {
    if (!this.el) { console.warn("ItemList.render: container not found"); return; }
    var self = this;

    var total = this.items.length;
    var start = (this.page - 1) * this.pageSize;
    var pageItems = this.items.slice(start, start + this.pageSize);
    var totalPages = Math.ceil(total / this.pageSize);

    if (total === 0) {
      this.el.innerHTML =
        '<div class="sb-empty">暂无数据<br><small>点击左侧 [+ 新建] 添加第一条</small></div>';
      return;
    }

    var html = '<div class="sb-list">';
    pageItems.forEach(function (item) {
      html += ItemCard.render(item, item.id === self.activeId);
    });
    html += "</div>";

    // Pagination
    if (totalPages > 1) {
      html += '<div class="sb-pagination">';
      html +=
        '<button class="sb-page-btn" ' + (self.page <= 1 ? "disabled" : "") +
        ' data-page="' + (self.page - 1) + '">‹</button>';
      html +=
        '<span class="sb-page-info">' + self.page + " / " + totalPages + "</span>";
      html +=
        '<button class="sb-page-btn" ' + (self.page >= totalPages ? "disabled" : "") +
        ' data-page="' + (self.page + 1) + '">›</button>';
      html += "</div>";
    }

    this.el.innerHTML = html;

    // Bind card clicks
    var cards = this.el.querySelectorAll(".sb-card");
    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        var id = this.getAttribute("data-id");
        self.setActive(id);
        if (self.onSelect) self.onSelect(id);
      });
    });

    // Bind pagination
    var btns = this.el.querySelectorAll(".sb-page-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = parseInt(this.getAttribute("data-page"));
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          self.page = p;
          self.render();
        }
      });
    });
  }
};
