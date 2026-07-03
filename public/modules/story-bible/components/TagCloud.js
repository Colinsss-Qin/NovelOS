/* TagCloud — clickable tag cloud with frequency sizing */
var TagCloud = {
  el: null,
  activeTags: [],
  onTagClick: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  /** @param {string} projectId */
  render: function (projectId) {
    if (!this.el) return;
    var self = this;

    var result = KnowledgeSkill.tags(projectId);
    var tags = result.data || [];

    if (tags.length === 0) {
      this.el.innerHTML = '<p class="sb-muted">暂无标签</p>';
      return;
    }

    // Count frequencies (for sizing) — approximate from list
    var allResult = KnowledgeSkill.list({ projectId: projectId, limit: 1000 });
    var freq = {};
    if (allResult.data && allResult.data.items) {
      allResult.data.items.forEach(function (item) {
        (item.tags || []).forEach(function (t) {
          freq[t] = (freq[t] || 0) + 1;
        });
      });
    }

    var maxFreq = 1;
    Object.keys(freq).forEach(function (k) {
      if (freq[k] > maxFreq) maxFreq = freq[k];
    });

    var html = '<div class="sb-tag-cloud">';
    tags.forEach(function (tag) {
      var count = freq[tag] || 1;
      var size = count <= 1 ? "sm" : count <= 3 ? "md" : "lg";
      var active = self.activeTags.indexOf(tag) !== -1 ? " active" : "";
      html +=
        '<span class="sb-cloud-tag ' + size + active + '" data-tag="' + _esc(tag) + '">' +
        _esc(tag) + " (" + count + ")</span>";
    });
    html += "</div>";

    this.el.innerHTML = html;

    var tagEls = this.el.querySelectorAll(".sb-cloud-tag");
    tagEls.forEach(function (el) {
      el.addEventListener("click", function () {
        var tag = this.getAttribute("data-tag");
        var idx = self.activeTags.indexOf(tag);
        if (idx === -1) self.activeTags.push(tag);
        else self.activeTags.splice(idx, 1);
        self.render(projectId); // re-render to update active states
        if (self.onTagClick) self.onTagClick(self.activeTags.slice());
      });
    });
  }
};
