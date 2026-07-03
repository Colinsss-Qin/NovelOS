/* CharEditor — create / edit character form */
var CharEditor = {
  el: null,
  mode: "create",
  character: null,
  onSave: null,
  onCancel: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    var self = this;
    this.el.addEventListener("click", function (e) {
      if (e.target.classList.contains("cm-form-cancel") && self.onCancel) self.onCancel();
      if (e.target.classList.contains("cm-form-save") && self.onSave) self.onSave(self._collect());
    });
  },

  showCreate: function (prefill) {
    this.mode = "create";
    this.character = null;
    this._render(prefill || {});
  },

  showEdit: function (character) {
    this.mode = "edit";
    this.character = character;
    this._render(character);
  },

  _render: function (data) {
    if (!this.el) return;
    var d = data || {};

    var html = '<div class="cm-editor">';
    html += "<h2>" + (this.mode === "create" ? "新建角色" : "编辑 " + _esc(d.name || "")) + "</h2>";

    // Row 1: name + alias
    html += '<div class="cm-form-row">';
    html += _inputRow("姓名", "cm-name", "text", d.name || "", "请输入角色姓名", true);
    html += _inputRow("别名", "cm-alias", "text", d.alias || "", "称号/化名");
    html += "</div>";

    // Row 2: gender + age
    html += '<div class="cm-form-row">';
    html += _selectRow("性别", "cm-gender", ["未知", "男", "女", "其他"], d.gender || "未知");
    html += _inputRow("年龄", "cm-age", "number", d.age || "", "0");
    html += "</div>";

    // Row 3: race + occupation
    html += '<div class="cm-form-row">';
    html += _selectRow("种族", "cm-race", ["人类", "精灵", "矮人", "兽人", "龙裔", "魔族", "仙族", "妖族", "亡灵", "半神", "机械", "其他"], d.race || "人类");
    html += _inputRow("职业", "cm-occupation", "text", d.occupation || "", "职业/身份");
    html += "</div>";

    // birthday
    html += _inputRow("生日", "cm-birthday", "text", d.birthday || "", "YYYY-MM-DD 或描述性文字");

    // appearance
    html += _textareaRow("外观", "cm-appearance", d.appearance || "", "外貌、衣着、体态特征…");

    // personality
    html += _textareaRow("性格", "cm-personality", d.personality || "", "性格特点、行为模式、口头禅…");

    // background
    html += _textareaRow("背景", "cm-background", d.background || "", "身世来历、过往经历…");

    // goal + motivation
    html += '<div class="cm-form-row">';
    html += _textareaRowSmall("目标", "cm-goal", d.goal || "", "角色想要达成的目标");
    html += _textareaRowSmall("动机", "cm-motivation", d.motivation || "", "驱动力/内在动机");
    html += "</div>";

    // status (edit mode only)
    if (this.mode === "edit") {
      html += _selectRow("状态", "cm-status", ["active", "deceased", "archived", "suspended"], d.status || "active");
    }

    // notes
    html += _textareaRow("备注", "cm-notes", d.notes || "", "创作备忘…");

    // Actions
    html +=
      '<div class="cm-form-actions">' +
      '<button class="cm-form-cancel">取消</button>' +
      '<button class="cm-form-save">' + (this.mode === "create" ? "创建" : "保存") + "</button>" +
      "</div>";

    html += "</div>";
    this.el.innerHTML = html;
  },

  _collect: function () {
    var g = _val;
    return {
      name: g("cm-name"),
      alias: g("cm-alias"),
      gender: g("cm-gender"),
      age: parseInt(g("cm-age")) || 0,
      birthday: g("cm-birthday"),
      race: g("cm-race"),
      occupation: g("cm-occupation"),
      appearance: g("cm-appearance"),
      personality: g("cm-personality"),
      background: g("cm-background"),
      goal: g("cm-goal"),
      motivation: g("cm-motivation"),
      status: g("cm-status") || undefined,
      notes: g("cm-notes"),
    };
  },
};

function _val(id) {
  var el = document.getElementById(id);
  return el ? el.value : "";
}

function _inputRow(label, id, type, value, placeholder, required) {
  return (
    '<div class="cm-form-group">' +
    '<label class="cm-form-label">' +
    label +
    (required ? ' <span class="cm-required">*</span>' : "") +
    "</label>" +
    '<input type="' + type + '" class="cm-form-input" id="' + id + '" value="' +
    _esc(String(value || "")) + '" placeholder="' + _esc(placeholder || "") + '">' +
    "</div>"
  );
}

function _selectRow(label, id, options, selected) {
  var opts = options
    .map(function (o) {
      return '<option value="' + o + '"' + (o === selected ? " selected" : "") + ">" + o + "</option>";
    })
    .join("");
  return (
    '<div class="cm-form-group">' +
    '<label class="cm-form-label">' + label + "</label>" +
    '<select class="cm-form-input" id="' + id + '">' + opts + "</select>" +
    "</div>"
  );
}

function _textareaRow(label, id, value, placeholder) {
  return (
    '<div class="cm-form-group">' +
    '<label class="cm-form-label">' + label + "</label>" +
    '<textarea class="cm-form-input" id="' + id + '" placeholder="' + _esc(placeholder || "") + '" rows="3">' +
    _esc(String(value || "")) +
    "</textarea>" +
    "</div>"
  );
}

function _textareaRowSmall(label, id, value, placeholder) {
  return (
    '<div class="cm-form-group">' +
    '<label class="cm-form-label">' + label + "</label>" +
    '<textarea class="cm-form-input" id="' + id + '" placeholder="' + _esc(placeholder || "") + '" rows="2">' +
    _esc(String(value || "")) +
    "</textarea>" +
    "</div>"
  );
}
