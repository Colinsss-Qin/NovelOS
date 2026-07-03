/* ================================================================
   TreeView — 卷 → 章 → 场景 树形视图
   支持展开/折叠、拖拽排序、内联快速创建
   ================================================================ */

var TreeView = {
  el: null,
  treeData: null,
  onRefresh: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (tree) {
    if (!this.el) return;
    this.treeData = tree;
    if (!tree || !tree.volumes || tree.volumes.length === 0) {
      this.el.innerHTML = '<div class="ob-tree-empty">暂无大纲数据<br><small>点击顶部「+ 快速创建」开始</small></div>';
      return;
    }
    var self = this;
    var html = '<div class="ob-tree">';
    html += '<div style="font-size:16px;font-weight:700;color:#d0cec8;margin-bottom:12px">' + _esc(tree.story.title) + '</div>';
    tree.volumes.forEach(function (vol) {
      html += self._renderVolume(vol);
    });
    html += '</div>';
    this.el.innerHTML = html;
    this._bind();
  },

  _renderVolume: function (vol) {
    var h = '';
    h += '<div class="ob-tree-node" draggable="true" data-id="' + vol.id + '" data-type="volume">';
    h += '<div class="ob-tree-header">';
    h += '<span class="ob-tree-toggle open" data-toggle="vol-' + vol.id + '">▶</span>';
    h += '<span class="ob-tree-icon">📘</span>';
    h += '<span class="ob-tree-name volume">' + _esc(vol.title) + '</span>';
    h += '<span class="ob-tree-meta">' + (vol.chapters ? vol.chapters.length : 0) + ' 章</span>';
    h += '<span class="ob-tree-actions">';
    h += '<button class="ob-tree-act-btn" data-action="add-chapter" data-vid="' + vol.id + '" title="添加章节">+章</button>';
    h += '<button class="ob-tree-act-btn" data-action="delete" data-id="' + vol.id + '" data-type="volume" title="删除">✕</button>';
    h += '</span></div>';
    h += '<div class="ob-tree-children open" id="vol-' + vol.id + '">';
    if (vol.chapters) {
      vol.chapters.forEach(function (ch) { h += this._renderChapter(ch); }, this);
    }
    h += '</div></div>';
    return h;
  },

  _renderChapter: function (ch) {
    var statusClass = ch.status || '未开始';
    var h = '';
    h += '<div class="ob-tree-node" draggable="true" data-id="' + ch.id + '" data-type="chapter">';
    h += '<div class="ob-tree-header">';
    h += '<span class="ob-tree-toggle" data-toggle="ch-' + ch.id + '">▶</span>';
    h += '<span class="ob-tree-icon">📄</span>';
    h += '<span class="ob-tree-name chapter">' + _esc(ch.title) + '</span>';
    h += '<span class="ob-tree-status ' + statusClass + '">' + statusClass + '</span>';
    h += '<span class="ob-tree-actions">';
    h += '<button class="ob-tree-act-btn" data-action="add-scene" data-cid="' + ch.id + '" title="添加场景">+场</button>';
    h += '<button class="ob-tree-act-btn" data-action="delete" data-id="' + ch.id + '" data-type="chapter" title="删除">✕</button>';
    h += '</span></div>';
    h += '<div class="ob-tree-children" id="ch-' + ch.id + '">';
    if (ch.scenes) {
      ch.scenes.forEach(function (sc) { h += this._renderScene(sc); }, this);
    }
    h += '</div></div>';
    return h;
  },

  _renderScene: function (sc) {
    var refs = [];
    if (sc.characterIds && sc.characterIds.length) refs.push(sc.characterIds.length + '人');
    if (sc.locationIds && sc.locationIds.length) refs.push(sc.locationIds.length + '地');
    var h = '';
    h += '<div class="ob-tree-node" draggable="true" data-id="' + sc.id + '" data-type="scene">';
    h += '<div class="ob-tree-header">';
    h += '<span style="width:12px"></span>';
    h += '<span class="ob-tree-icon">🎬</span>';
    h += '<span class="ob-tree-name">' + _esc(sc.title) + '</span>';
    if (refs.length) h += '<span class="ob-tree-meta">' + refs.join('·') + '</span>';
    h += '<span class="ob-tree-actions">';
    h += '<button class="ob-tree-act-btn" data-action="delete" data-id="' + sc.id + '" data-type="scene" title="删除">✕</button>';
    h += '</span></div></div>';
    return h;
  },

  _bind: function () {
    var self = this;
    if (!this.el) return;

    // Toggle expand
    this.el.querySelectorAll(".ob-tree-toggle").forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.stopPropagation();
        var targetId = this.getAttribute("data-toggle");
        var children = document.getElementById(targetId);
        if (children) { children.classList.toggle("open"); this.classList.toggle("open"); }
      });
    });

    // Action buttons
    this.el.addEventListener("click", function (e) {
      var btn = e.target.closest(".ob-tree-act-btn");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "add-chapter") { OutlineBoard._openQuickCreate("chapter", { volumeId: btn.getAttribute("data-vid") }); }
      if (action === "add-scene") { OutlineBoard._openQuickCreate("scene", { chapterId: btn.getAttribute("data-cid") }); }
      if (action === "delete") { OutlineBoard._deleteEntity(btn.getAttribute("data-type"), btn.getAttribute("data-id")); }
    });

    // Drag & drop
    this.el.querySelectorAll(".ob-tree-node[draggable]").forEach(function (node) {
      node.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", JSON.stringify({ id: this.getAttribute("data-id"), type: this.getAttribute("data-type") }));
        this.style.opacity = "0.4";
      });
      node.addEventListener("dragend", function () { this.style.opacity = "1"; });
      node.addEventListener("dragover", function (e) { e.preventDefault(); this.querySelector(".ob-tree-header").classList.add("dragover"); });
      node.addEventListener("dragleave", function () { this.querySelector(".ob-tree-header").classList.remove("dragover"); });
      node.addEventListener("drop", function (e) {
        e.preventDefault();
        this.querySelector(".ob-tree-header").classList.remove("dragover");
        var dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
        var targetId = this.getAttribute("data-id");
        var targetType = this.getAttribute("data-type");
        if (dragData.id !== targetId && self.onRefresh) self.onRefresh(dragData, targetId, targetType);
      });
    });
  },
};
