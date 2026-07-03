/* ItemEditor — dynamic form builder from type templates */
var ItemEditor = {
  el: null,
  mode: "create",   // "create" | "edit"
  type: null,
  item: null,
  onSave: null,
  onCancel: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;

    this.el.addEventListener("click", function (e) {
      if (e.target.classList.contains("sb-editor-cancel")) {
        if (self.onCancel) self.onCancel();
      } else if (e.target.classList.contains("sb-editor-save")) {
        if (self.onSave) self.onSave(self.collectFormData());
      }
    });

    // Tag input enter key handler
    this.el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.classList.contains("sb-tag-input")) {
        e.preventDefault();
        var val = e.target.value.trim();
        if (!val) return;
        var container = e.target.parentElement;
        var display = container.querySelector(".sb-tags-display");
        var tag = document.createElement("span");
        tag.className = "sb-tag-chip";
        tag.textContent = val;
        tag.addEventListener("click", function () { tag.remove(); });
        display.appendChild(tag);
        e.target.value = "";
      }
    });
  },

  /** Create mode — generate empty form with defaults */
  showCreate: function (type, prefill) {
    this.mode = "create";
    this.type = type;
    this.item = null;
    var defaults = KnowledgeSkill.buildAttrs(type, prefill ? prefill.attrs : {});
    var initial = prefill || {};
    initial.attrs = defaults;
    this._render(initial);
  },

  /** Edit mode — populate form from existing item */
  showEdit: function (item) {
    this.mode = "edit";
    this.type = item.type;
    this.item = item;
    this._render(item);
  },

  hide: function () {
    if (this.el) this.el.innerHTML = "";
  },

  /** Collect form data as { name, summary, tags, attrs, ... } */
  collectFormData: function () {
    if (!this.el) return {};
    var template = StoryBibleTemplates[this.type];
    if (!template) return {};

    var data = { type: this.type, tags: [], attrs: {} };

    template.fields.forEach(function (field) {
      var rawValue = _getFieldValue(field);

      if (field.key === "name") data.name = rawValue;
      else if (field.key === "summary") data.summary = rawValue;
      else if (field.key === "description") data.description = rawValue;
      else if (field.key === "tags") data.tags = rawValue;
      else if (field.key === "aliases") data.aliases = rawValue;
      else if (field.key.startsWith("attrs.")) {
        var attrKey = field.key.slice(6);
        data.attrs[attrKey] = rawValue;
      }
    });

    // Collect tags from tag chips
    var tagChips = this.el.querySelectorAll(".sb-tag-chip");
    var chipTags = [];
    tagChips.forEach(function (chip) { chipTags.push(chip.textContent.trim()); });
    if (chipTags.length > 0) data.tags = chipTags;

    // Collect aliases from alias chips
    var aliasChips = this.el.querySelectorAll(".sb-aliases-display .sb-tag-chip");
    if (aliasChips.length > 0) data.aliases = [];
    aliasChips.forEach(function (chip) { data.aliases.push(chip.textContent.trim()); });

    // If editing, include id + projectId
    if (this.mode === "edit" && this.item) {
      data.id = this.item.id;
      data.projectId = this.item.projectId;
    }

    return data;
  },

  /** Internal render */
  _render: function (data) {
    if (!this.el) return;
    var template = StoryBibleTemplates[this.type];
    if (!template) { this.el.innerHTML = "<p>未知类型</p>"; return; }

    var html = '<div class="sb-editor">';
    html +=
      '<h2>' + (this.mode === "create" ? "新建" : "编辑") +
      template.title + "</h2>";

    // Section tabs
    var sections = template.sections || [];
    html += '<div class="sb-editor-tabs">';
    sections.forEach(function (sec, i) {
      html +=
        '<button class="sb-editor-tab' + (i === 0 ? " active" : "") +
        '" data-section="' + sec.key + '">' + (sec.icon || "") + " " + sec.label + "</button>";
    });
    html += "</div>";

    // Fields grouped by section
    sections.forEach(function (sec, secIdx) {
      html +=
        '<div class="sb-editor-section' + (secIdx === 0 ? " active" : "") +
        '" data-section="' + sec.key + '">';

      template.fields
        .filter(function (f) { return f.section === sec.key; })
        .forEach(function (field) {
          var value = _resolveValue(data, field);
          html += _renderField(field, value);
        });

      html += "</div>";
    });

    // Actions
    html +=
      '<div class="sb-editor-actions">' +
      '<button class="sb-editor-cancel">取消</button>' +
      '<button class="sb-editor-save">' +
      (this.mode === "create" ? "创建" : "保存") +
      "</button>" +
      "</div>";

    html += "</div>";
    this.el.innerHTML = html;

    // Section tab switching
    var self = this;
    var tabBtns = this.el.querySelectorAll(".sb-editor-tab");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sec = this.getAttribute("data-section");
        self.el.querySelectorAll(".sb-editor-tab").forEach(function (b) { b.classList.remove("active"); });
        self.el.querySelectorAll(".sb-editor-section").forEach(function (s) { s.classList.remove("active"); });
        this.classList.add("active");
        var target = self.el.querySelector('.sb-editor-section[data-section="' + sec + '"]');
        if (target) target.classList.add("active");
      });
    });
  }
};

// ================================================================
//  INTERNAL HELPERS
// ================================================================

function _resolveValue(data, field) {
  if (!data) return "";
  if (field.key === "name") return data.name || "";
  if (field.key === "summary") return data.summary || "";
  if (field.key === "description") return data.description || "";
  if (field.key === "tags") return Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
  if (field.key === "aliases") return Array.isArray(data.aliases) ? data.aliases.join(", ") : "";
  if (field.key.startsWith("attrs.") && data.attrs) {
    var k = field.key.slice(6);
    var v = data.attrs[k];
    if (Array.isArray(v)) return v.join(", ");
    return v !== undefined ? v : "";
  }
  return "";
}

function _getFieldValue(field) {
  var el = document.querySelector('[data-field-key="' + field.key + '"]');
  if (!el) return undefined;

  if (field.type === "number") {
    var n = parseInt(el.value, 10);
    return isNaN(n) ? undefined : n;
  }
  if (field.type === "tags-input") {
    // For simple comma input (non-chip), split by comma
    var raw = el.value.trim();
    if (!raw) return [];
    return raw.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  return el.value || "";
}

function _renderField(field, value) {
  var html = '<div class="sb-field">';
  html +=
    '<label class="sb-field-label">' + _esc(field.label) +
    (field.required ? ' <span class="sb-required">*</span>' : "") +
    "</label>";

  if (field.type === "textarea") {
    html +=
      '<textarea class="sb-field-input" data-field-key="' + field.key +
      '" rows="' + (field.rows || 3) + '" placeholder="' + _esc(field.placeholder || "") +
      '">' + _esc(String(value || "")) + "</textarea>";
  } else if (field.type === "select") {
    html +=
      '<select class="sb-field-input" data-field-key="' + field.key + '">';
    (field.options || []).forEach(function (opt) {
      html +=
        '<option value="' + _esc(opt) + '"' +
        (value === opt ? " selected" : "") + ">" + _esc(opt) + "</option>";
    });
    html += "</select>";
  } else if (field.type === "number") {
    html +=
      '<input type="number" class="sb-field-input" data-field-key="' + field.key +
      '" value="' + _esc(String(value || "")) + '"' +
      (field.min !== undefined ? ' min="' + field.min + '"' : "") +
      (field.max !== undefined ? ' max="' + field.max + '"' : "") + ">";
  } else if (field.type === "tags-input") {
    html +=
      '<div class="sb-tags-field">' +
      '<div class="sb-tags-display"></div>' +
      '<input type="text" class="sb-tag-input" placeholder="' + _esc(field.placeholder || "输入后回车添加") + '">' +
      "</div>";
    // Tags rendering happens after innerHTML — handled via JS
  } else {
    html +=
      '<input type="text" class="sb-field-input" data-field-key="' + field.key +
      '" value="' + _esc(String(value || "")) + '"' +
      ' placeholder="' + _esc(field.placeholder || "") + '">';
  }

  html += "</div>";
  return html;
}
