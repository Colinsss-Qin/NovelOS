/* CharDetail — character detail view with tabs */
var CharDetail = {
  el: null,
  onEdit: null,
  onDelete: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;
    this.el.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      if (btn.classList.contains("cm-btn-edit") && self.onEdit) self.onEdit();
      if (btn.classList.contains("cm-btn-delete") && self.onDelete) self.onDelete();
    });
  },

  show: function (character, relations) {
    if (!this.el || !character) return;
    var c = character;
    var rels = relations || [];
    var statusLabels = { active: "活跃", deceased: "已故", archived: "归档", suspended: "暂停" };

    var html = '<div class="cm-detail">';

    // Header
    html +=
      '<div class="cm-detail-header">' +
      "<div>" +
      '<div class="cm-detail-name">' + _esc(c.name) + "</div>" +
      (c.alias ? '<div class="cm-detail-alias">' + _esc(c.alias) + "</div>" : "") +
      "</div>" +
      '<div class="cm-detail-actions">' +
      '<button class="cm-btn-edit">✏️ 编辑</button>' +
      '<button class="cm-btn-delete">🗑️ 删除</button>' +
      "</div>" +
      "</div>";

    // 基础信息
    html += '<div class="cm-section"><div class="cm-section-title">📋 基础信息</div>';
    html += '<div class="cm-field-grid">';
    html += _field("性别", c.gender !== "未知" ? c.gender : "—");
    html += _field("年龄", c.age > 0 ? c.age + " 岁" : "—");
    html += _field("生日", c.birthday || "—");
    html += _field("种族", c.race || "—");
    html += _field("职业", c.occupation || "—");
    html += _field("状态", '<span style="color:' + _statusColor(c.status) + '">' + (statusLabels[c.status] || c.status) + "</span>");
    html += "</div></div>";

    // 外观
    if (c.appearance) {
      html += '<div class="cm-section"><div class="cm-section-title">👤 外观</div>';
      html += '<div class="cm-text-block">' + _esc(c.appearance) + "</div></div>";
    }

    // 性格
    if (c.personality) {
      html += '<div class="cm-section"><div class="cm-section-title">🧠 性格</div>';
      html += '<div class="cm-text-block">' + _esc(c.personality) + "</div></div>";
    }

    // 背景
    if (c.background) {
      html += '<div class="cm-section"><div class="cm-section-title">📖 背景</div>';
      html += '<div class="cm-text-block">' + _esc(c.background) + "</div></div>";
    }

    // 目标
    if (c.goal || c.motivation) {
      html += '<div class="cm-section"><div class="cm-section-title">🎯 目标与动机</div>';
      if (c.goal) html += '<div class="cm-text-block"><strong style="color:#6b6880">目标：</strong>' + _esc(c.goal) + "</div>";
      if (c.motivation) html += '<div class="cm-text-block" style="margin-top:8px"><strong style="color:#6b6880">动机：</strong>' + _esc(c.motivation) + "</div>";
      html += "</div>";
    }

    // 关系
    html += '<div class="cm-section"><div class="cm-section-title">🔗 关系 (' + rels.length + ")</div>";
    if (rels.length === 0) {
      html += '<div style="color:#555;font-size:12px">暂无关系</div>';
    } else {
      html += '<div class="cm-rel-list">';
      rels.forEach(function (r) {
        html += CharRelationList.renderItem(r);
      });
      html += "</div>";
    }
    html += "</div>";

    html += "</div>";
    this.el.innerHTML = html;
  },

  showEmpty: function () {
    if (!this.el) return;
    this.el.innerHTML =
      '<div class="cm-empty-state">' +
      '<div class="cm-empty-icon">👤</div>' +
      '<div class="cm-empty-text">从左侧列表选择角色查看详情</div>' +
      "</div>";
  },
};

function _field(key, val) {
  return '<div class="cm-field"><span class="cm-field-key">' + key + '</span><span class="cm-field-val">' + val + "</span></div>";
}

function _statusColor(status) {
  var map = { active: "#5aab8a", deceased: "#c06060", archived: "#6b6880", suspended: "#d4a574" };
  return map[status] || "#8a8798";
}
