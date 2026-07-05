/* ================================================================
   FutureSceneEditor — Modal-based editor for create / edit
   ================================================================ */

var FutureSceneEditor = {
  _overlay: null,
  _resolve: null,

  /** Open the editor. Returns a Promise that resolves with form data or null on cancel. */
  open: function (scene, charNames, locNames, facNames, chapterNames, chapters) {
    var self = this;
    this._closeOverlay();
    return new Promise(function (resolve) {
      self._resolve = resolve;
      self._render(scene, charNames, locNames, facNames, chapterNames, chapters);
    });
  },

  close: function () {
    if (this._resolve) {
      this._resolve(null);
      this._resolve = null;
    }
    this._closeOverlay();
  },

  _closeOverlay: function () {
    if (this._overlay) {
      document.body.removeChild(this._overlay);
      this._overlay = null;
    }
  },

  _render: function (scene, charNames, locNames, facNames, chapterNames, chapters) {
    var self = this;
    var isEdit = !!scene;
    var s = scene || {};

    this._overlay = document.createElement("div");
    this._overlay.className = "fs-modal-overlay";

    // Build chapter options grouped by volume
    var chOptions = "";
    if (chapters && chapters.length) {
      var byVolume = {};
      chapters.forEach(function (ch) {
        var v = ch.volumeTitle || "未分组";
        if (!byVolume[v]) byVolume[v] = [];
        byVolume[v].push(ch);
      });
      Object.keys(byVolume).forEach(function (vol) {
        chOptions += '<optgroup label="' + _esc(vol) + '">';
        byVolume[vol].forEach(function (ch) {
          var sel = (s.expectedChapterId === ch.id) ? " selected" : "";
          chOptions += '<option value="' + ch.id + '"' + sel + '>' + _esc(ch.title) + '</option>';
        });
        chOptions += '</optgroup>';
      });
    }

    // Entity dropdown builders
    function _entitySelect(field, label, nameMap) {
      var ids = (s[field] || []);
      var html = '<div class="fs-form-group">';
      html += '<label class="fs-form-label">' + label + '</label>';
      html += '<div class="fs-entity-tags" id="fs-entity-tags-' + field + '">';
      ids.forEach(function (id) {
        var nm = (nameMap && nameMap[id]) ? nameMap[id] : id;
        html += '<span class="fs-entity-tag">' + _esc(nm) + '<button class="fs-entity-remove" data-field="' + field + '" data-id="' + id + '">×</button></span>';
      });
      html += '</div>';
      html += '<select class="fs-form-select fs-entity-add" id="fs-entity-add-' + field + '" data-field="' + field + '">';
      html += '<option value="">+ 添加' + label + '</option>';
      if (nameMap) {
        Object.keys(nameMap).forEach(function (id) {
          if (ids.indexOf(id) === -1) {
            html += '<option value="' + id + '">' + _esc(nameMap[id]) + '</option>';
          }
        });
      }
      html += '</select>';
      html += '<input type="hidden" id="fs-hidden-' + field + '" value="' + _esc(JSON.stringify(ids)) + '">';
      html += '</div>';
      return html;
    }

    var overlay = this._overlay;
    overlay.innerHTML =
      '<div class="fs-modal">' +
      '<div class="fs-modal-header">' +
      '<h2>' + (isEdit ? "编辑场景" : "新建场景") + '</h2>' +
      '<button class="fs-modal-close" id="fs-editor-close">✕</button>' +
      '</div>' +
      '<div class="fs-modal-body">' +

      // Title
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">标题 <span class="fs-required">*</span></label>' +
      '<input class="fs-form-input" id="fs-editor-title" type="text" placeholder="如：最终决战·天人五衰" value="' + _esc(s.title || "") + '">' +
      '</div>' +

      // Summary
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">场景概述</label>' +
      '<textarea class="fs-form-textarea" id="fs-editor-summary" placeholder="简要描述场景画面..." rows="3">' + _esc(s.summary || "") + '</textarea>' +
      '</div>' +

      // sceneType + importance + emotionGoal (row)
      '<div class="fs-form-row">' +
      '<div class="fs-form-group fs-form-half">' +
      '<label class="fs-form-label">场景类型</label>' +
      '<select class="fs-form-select" id="fs-editor-sceneType">' +
      '<option value="">选择类型</option>' +
      '<option value="高潮"' + (s.sceneType === "高潮" ? " selected" : "") + '>高潮</option>' +
      '<option value="反转"' + (s.sceneType === "反转" ? " selected" : "") + '>反转</option>' +
      '<option value="战斗"' + (s.sceneType === "战斗" ? " selected" : "") + '>战斗</option>' +
      '<option value="情感"' + (s.sceneType === "情感" ? " selected" : "") + '>情感</option>' +
      '<option value="转折"' + (s.sceneType === "转折" ? " selected" : "") + '>转折</option>' +
      '<option value="结局"' + (s.sceneType === "结局" ? " selected" : "") + '>结局</option>' +
      '<option value="其他"' + (s.sceneType === "其他" ? " selected" : "") + '>其他</option>' +
      '</select>' +
      '</div>' +
      '<div class="fs-form-group fs-form-half">' +
      '<label class="fs-form-label">重要性</label>' +
      '<select class="fs-form-select" id="fs-editor-importance">' +
      '<option value="high"'   + (s.importance === "high"   ? " selected" : "") + '>★ 核心</option>' +
      '<option value="medium"' + (s.importance === "medium" ? " selected" : "") + '>● 重要</option>' +
      '<option value="low"'    + (s.importance === "low"    ? " selected" : "") + '>○ 次要</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      // emotionGoal
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">情绪目标</label>' +
      '<input class="fs-form-input" id="fs-editor-emotionGoal" type="text" placeholder="虐/爽/高燃/感人/紧张..." value="' + _esc(s.emotionGoal || "") + '">' +
      '</div>' +

      // triggerConditions
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">触发条件</label>' +
      '<textarea class="fs-form-textarea" id="fs-editor-triggerConditions" placeholder="描述触发这个场景的条件，如：主角集齐三件信物后..." rows="2">' + _esc(s.triggerConditions || "") + '</textarea>' +
      '</div>' +

      // prerequisiteEvents
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">前置事件</label>' +
      '<textarea class="fs-form-textarea" id="fs-editor-prerequisiteEvents" placeholder="需要先发生哪些事件？如：主角得知真相、联盟破裂..." rows="2">' + _esc(s.prerequisiteEvents || "") + '</textarea>' +
      '</div>' +

      // targetCharacters
      _entitySelect("targetCharacters", "关联人物", charNames) +

      // targetLocations
      _entitySelect("targetLocations", "关联地点", locNames) +

      // targetFactions
      _entitySelect("targetFactions", "关联势力", facNames) +

      // expectedChapter
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">预计章节</label>' +
      '<select class="fs-form-select" id="fs-editor-expectedChapterId">' +
      '<option value="">选择章节</option>' +
      chOptions +
      '</select>' +
      '</div>' +

      // status (edit only)
      (isEdit ? '<div class="fs-form-group"><label class="fs-form-label">状态</label><select class="fs-form-select" id="fs-editor-status"><option value="构思中"' + (s.status === "构思中" ? " selected" : "") + '>构思中</option><option value="规划中"' + (s.status === "规划中" ? " selected" : "") + '>规划中</option><option value="推进中"' + (s.status === "推进中" ? " selected" : "") + '>推进中</option><option value="已完成"' + (s.status === "已完成" ? " selected" : "") + '>已完成</option><option value="废弃"'   + (s.status === "废弃"   ? " selected" : "") + '>废弃</option></select></div>' : '') +

      // notes
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">备注</label>' +
      '<textarea class="fs-form-textarea" id="fs-editor-notes" placeholder="其他备注..." rows="2">' + _esc(s.notes || "") + '</textarea>' +
      '</div>' +

      // tags
      '<div class="fs-form-group">' +
      '<label class="fs-form-label">标签（逗号分隔）</label>' +
      '<input class="fs-form-input" id="fs-editor-tags" type="text" placeholder="如：关键转折, 主角成长, 伏笔回收" value="' + _esc(s.tags || "") + '">' +
      '</div>' +

      '</div>' + // /modal-body

      '<div class="fs-modal-footer">' +
      (isEdit ? '<button class="fs-btn fs-btn-danger" id="fs-editor-delete">删除场景</button>' : '') +
      '<div class="fs-modal-actions">' +
      '<button class="fs-btn fs-btn-cancel" id="fs-editor-cancel">取消</button>' +
      '<button class="fs-btn fs-btn-primary" id="fs-editor-save">' + (isEdit ? "保存修改" : "创建场景") + '</button>' +
      '</div>' +
      '</div>' +

      '</div>'; // /modal

    document.body.appendChild(this._overlay);

    // ── Bind Events ──

    // Close / Cancel
    document.getElementById("fs-editor-close").addEventListener("click", function () { self.close(); });
    document.getElementById("fs-editor-cancel").addEventListener("click", function () { self.close(); });
    this._overlay.addEventListener("click", function (e) { if (e.target === self._overlay) self.close(); });

    // Entity add: change select → add to hidden + re-render tag
    this._overlay.querySelectorAll(".fs-entity-add").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var field = this.getAttribute("data-field");
        var id = this.value;
        if (!id) return;
        var hidden = document.getElementById("fs-hidden-" + field);
        var arr = JSON.parse(hidden.value || "[]");
        if (arr.indexOf(id) === -1) {
          arr.push(id);
          hidden.value = JSON.stringify(arr);
        }
        // Re-render tags & reset select options
        self._renderEntityTags(field, arr);
        this.value = "";
      });
    });

    // Entity remove: delegated on tags container
    this._overlay.querySelectorAll(".fs-entity-tags").forEach(function (tagsEl) {
      tagsEl.addEventListener("click", function (e) {
        if (e.target.classList.contains("fs-entity-remove")) {
          var field = e.target.getAttribute("data-field");
          var id = e.target.getAttribute("data-id");
          var hidden = document.getElementById("fs-hidden-" + field);
          var arr = JSON.parse(hidden.value || "[]");
          arr = arr.filter(function (x) { return x !== id; });
          hidden.value = JSON.stringify(arr);
          self._renderEntityTags(field, arr);
        }
      });
    });

    // Save
    document.getElementById("fs-editor-save").addEventListener("click", function () {
      var title = document.getElementById("fs-editor-title").value.trim();
      if (!title) {
        LayoutSkill.showToast("请输入场景标题");
        return;
      }
      var data = {
        title:              title,
        summary:            document.getElementById("fs-editor-summary").value.trim() || null,
        sceneType:          document.getElementById("fs-editor-sceneType").value || null,
        importance:         document.getElementById("fs-editor-importance").value || "medium",
        emotionGoal:        document.getElementById("fs-editor-emotionGoal").value.trim() || null,
        triggerConditions:  document.getElementById("fs-editor-triggerConditions").value.trim() || null,
        prerequisiteEvents: document.getElementById("fs-editor-prerequisiteEvents").value.trim() || null,
        targetCharacters:   JSON.parse(document.getElementById("fs-hidden-targetCharacters").value || "[]"),
        targetLocations:    JSON.parse(document.getElementById("fs-hidden-targetLocations").value || "[]"),
        targetFactions:     JSON.parse(document.getElementById("fs-hidden-targetFactions").value || "[]"),
        expectedChapterId:  document.getElementById("fs-editor-expectedChapterId").value || null,
        notes:              document.getElementById("fs-editor-notes").value.trim() || null,
        tags:               document.getElementById("fs-editor-tags").value.trim() || null,
      };
      if (isEdit) {
        var statusEl = document.getElementById("fs-editor-status");
        if (statusEl) data.status = statusEl.value;
      }
      self._closeOverlay();
      if (self._resolve) {
        self._resolve(data);
        self._resolve = null;
      }
    });

    // Delete (edit only)
    if (isEdit) {
      document.getElementById("fs-editor-delete").addEventListener("click", function () {
        NovelOSModal.confirm("删除确认", "确认删除场景「" + s.title + "」？此操作不可撤销。").then(function (ok) {
          if (!ok) return;
          self._closeOverlay();
          if (self._resolve) {
            self._resolve({ _delete: true });
            self._resolve = null;
          }
        });
      });
    }
  },

  // Re-render entity tags for a field
  _renderEntityTags: function (field, ids) {
    var tagsEl = document.getElementById("fs-entity-tags-" + field);
    var selEl = document.getElementById("fs-entity-add-" + field);
    if (!tagsEl || !selEl) return;

    var nameMap = {};
    if (field === "targetCharacters") nameMap = this._charNames || {};
    if (field === "targetLocations")  nameMap = this._locNames || {};
    if (field === "targetFactions")   nameMap = this._facNames || {};

    tagsEl.innerHTML = "";
    ids.forEach(function (id) {
      var nm = nameMap[id] || id;
      tagsEl.innerHTML += '<span class="fs-entity-tag">' + _esc(nm) + '<button class="fs-entity-remove" data-field="' + field + '" data-id="' + id + '">×</button></span>';
    });

    // Rebuild select options (unselected only)
    var currentHtml = '<option value="">+ 添加</option>';
    Object.keys(nameMap).forEach(function (id) {
      if (ids.indexOf(id) === -1) {
        currentHtml += '<option value="' + id + '">' + _esc(nameMap[id]) + '</option>';
      }
    });
    selEl.innerHTML = currentHtml;
  },
};
