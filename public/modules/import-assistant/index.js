/* ================================================================
   Import Assistant V2 — 导入助手
   Modal: upload → analyzing → results → confirming → done
   Writes to KnowledgeSkill (Story Bible memory) after confirm.
   ================================================================ */

(function () {
  "use strict";

  var TYPE_LABELS = {
    character: "人物", location: "地点", faction: "势力",
    rule: "规则体系", lore: "世界观", outline: "大纲",
    futureScene: "未来场景", note: "备注",
  };

  var TYPE_ICONS = {
    character: "👤", location: "📍", faction: "🏛️",
    rule: "📜", lore: "🌍", outline: "📄",
    futureScene: "🔮", note: "💡",
  };

  var TYPE_COLORS = {
    character: "#6b9aed", location: "#5aab8a", faction: "#d4a574",
    rule: "#c06060", lore: "#8b5cf6", outline: "#6b6880",
    futureScene: "#e8a840", note: "#5aab8a",
  };

  var state = {
    projectId: null,
    phase: "upload",
    suggestions: [],
    selectedIds: {},
    counts: {},
    sourceFile: "",
    confirmResult: null,
    _selectedFile: null,
  };

  var _escHandler = null;

  // ── Helpers ──

  function _esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function _$(id) { return document.getElementById(id); }

  function _toast(msg) {
    if (typeof LayoutSkill !== "undefined" && LayoutSkill.showToast) LayoutSkill.showToast(msg);
  }

  // ── Modal shell ──

  function _createModal() {
    var overlay = document.createElement("div");
    overlay.id = "ia-modal-overlay";
    overlay.innerHTML =
      '<div id="ia-modal">' +
      '<div id="ia-modal-header"><span class="ia-modal-title">📥 导入助手</span>' +
      '<button class="ia-modal-close" id="ia-btn-close">✕</button></div>' +
      '<div id="ia-modal-body"></div>' +
      '<div id="ia-modal-footer" class="ia-hidden"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) { if (e.target === overlay) ImportAssistant.close(); });
    _$("ia-btn-close").addEventListener("click", function () { ImportAssistant.close(); });
    _escHandler = function (e) { if (e.key === "Escape") ImportAssistant.close(); };
    document.addEventListener("keydown", _escHandler);
  }

  function _removeModal() {
    var overlay = _$("ia-modal-overlay");
    if (overlay) overlay.remove();
    if (_escHandler) { document.removeEventListener("keydown", _escHandler); _escHandler = null; }
  }

  function _renderBody(h) { var b = _$("ia-modal-body"); if (b) b.innerHTML = h; }
  function _renderFooter(h) {
    var f = _$("ia-modal-footer");
    if (!f) return;
    if (h) { f.innerHTML = h; f.classList.remove("ia-hidden"); }
    else { f.innerHTML = ""; f.classList.add("ia-hidden"); }
  }

  // ── Upload ──

  function _renderUpload() {
    _renderBody(
      '<div class="ia-dropzone" id="ia-dropzone">' +
      '<div class="ia-dropzone-icon">📂</div>' +
      '<div class="ia-dropzone-text">点击选择文件，或将文件拖放到此处</div>' +
      '<div class="ia-dropzone-hint">支持 .txt 和 .md 格式，最大 5MB</div>' +
      '<input type="file" id="ia-file-input" accept=".txt,.md" style="display:none">' +
      '</div><div id="ia-file-info" style="display:none" class="ia-file-info"></div>'
    );
    _renderFooter(null);
    _wireUpload();
  }

  function _wireUpload() {
    var dz = _$("ia-dropzone"), fi = _$("ia-file-input");
    if (!dz || !fi) return;
    dz.addEventListener("click", function () { fi.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("ia-dropzone-hover"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("ia-dropzone-hover"); });
    dz.addEventListener("drop", function (e) {
      e.preventDefault(); dz.classList.remove("ia-dropzone-hover");
      if (e.dataTransfer.files.length) _handleFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener("change", function () { if (fi.files.length) _handleFile(fi.files[0]); });
  }

  function _handleFile(file) {
    var ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "txt" && ext !== "md") { _toast("仅支持 .txt 和 .md 文件"); return; }
    if (file.size > 5 * 1024 * 1024) { _toast("文件过大，请选择 5MB 以内的文件"); return; }

    var info = _$("ia-file-info");
    if (!info) return;
    info.style.display = "block";
    info.innerHTML =
      '<div class="ia-file-info-row">' +
      '<span class="ia-file-name">📄 ' + _esc(file.name) + '</span>' +
      '<span class="ia-file-size">' + _fmtSize(file.size) + '</span>' +
      '</div>' +
      '<button class="ia-btn ia-btn-primary" id="ia-start-analyze">🔍 开始分析</button> ' +
      '<button class="ia-btn" id="ia-cancel-file">取消</button>';

    _$("ia-start-analyze").addEventListener("click", function () { _readAndAnalyze(file); });
    _$("ia-cancel-file").addEventListener("click", function () {
      info.style.display = "none";
      var fileInput = _$("ia-file-input");
      if (fileInput) fileInput.value = "";
    });
    state._selectedFile = file;
  }

  function _fmtSize(b) { return b < 1024 ? b+" B" : b < 1048576 ? (b/1024).toFixed(1)+" KB" : (b/1048576).toFixed(1)+" MB"; }

  function _readAndAnalyze(file) {
    state.phase = "analyzing"; state.sourceFile = file.name; _renderAnalyzing();
    var reader = new FileReader();
    reader.onload = function (e) { _callAnalyze(e.target.result, file.name); };
    reader.onerror = function () {
      _renderError("文件读取失败", "请检查文件编码，当前本地读取仅支持 UTF-8 文本。");
    };
    reader.readAsText(file, "UTF-8");
  }

  // ── Analyzing ──

  function _renderAnalyzing() {
    _renderBody(
      '<div class="ia-center"><div class="ia-spinner"></div>' +
      '<div class="ia-status-text">🤖 Kimi AI 正在分析 <strong>' + _esc(state.sourceFile) + '</strong>...</div>' +
      '<div class="ia-hint">长文将自动分块处理，可能需要数十秒</div></div>'
    );
    _renderFooter(null);
  }

  function _renderError(title, message) {
    state.phase = "upload";
    _renderBody(
      '<div class="ia-center">' +
      '<div style="font-size:40px;margin-bottom:12px">!</div>' +
      '<div class="ia-status-text">' + _esc(title || "分析失败") + '</div>' +
      '<div class="ia-hint" style="max-width:680px;white-space:pre-wrap;text-align:left">' + _esc(message || "未知错误") + '</div>' +
      '</div>'
    );
    _renderFooter(
      '<button class="ia-btn" id="ia-btn-retry">重新选择文件</button>' +
      '<button class="ia-btn ia-btn-primary" id="ia-btn-close-error">关闭</button>'
    );
    var retry = _$("ia-btn-retry");
    var close = _$("ia-btn-close-error");
    if (retry) retry.addEventListener("click", _reset);
    if (close) close.addEventListener("click", function () { ImportAssistant.close(); });
  }

  // ── Results ──

  function _renderResults() {
    var s = state.suggestions;
    var sel = Object.keys(state.selectedIds).length;
    var html = '<div class="ia-summary-bar">' +
      '<span>📄 ' + _esc(state.sourceFile) + '</span>' +
      '<span>共 <strong>' + s.length + '</strong> 条（' + (state._chunkCount || "?") + ' 块）</span>' +
      '<span>已选 <strong id="ia-selected-count">' + sel + '</strong></span>' +
      '<span class="ia-select-all" id="ia-select-all-btn">全选/取消</span></div>';

    // Group by type
    var order = ["character","location","faction","rule","lore","outline","futureScene","note"];
    order.forEach(function (tp) {
      var items = s.filter(function (x) { return x.type === tp; });
      if (!items.length) return;
      html +=
        '<div class="ia-category-section">' +
        '<div class="ia-category-header" style="border-left-color:' + (TYPE_COLORS[tp] || "#6b6880") + '">' +
        '<span class="ia-category-icon">' + (TYPE_ICONS[tp] || "") + '</span>' +
        '<span class="ia-category-label">' + (TYPE_LABELS[tp] || tp) + '</span>' +
        '<span class="ia-category-count">' + items.length + '</span></div>';

      items.forEach(function (sug) {
        var idx = s.indexOf(sug);
        var checked = state.selectedIds[idx] ? "checked" : "";
        var isConflict = sug.status === "conflict";
        var cardClass = (state.selectedIds[idx] ? "" : "ia-unchecked") + (isConflict ? " ia-conflict" : "");

        html += '<div class="ia-suggestion-card' + cardClass + '" data-idx="' + idx + '">' +
          '<label class="ia-suggestion-checkbox">' +
          (isConflict ? '<span class="ia-conflict-badge" title="与其他条目存在冲突">⚠️ 冲突</span>' : '') +
          '<input type="checkbox" data-idx="' + idx + '" ' + checked + (isConflict ? " disabled" : "") + '>' +
          '<span class="ia-suggestion-name">' + _esc(sug.title) + '</span>' +
          '<span class="ia-confidence">' + Math.round((sug.confidence || 0.7) * 100) + '%</span>' +
          '</label>' +
          '<div class="ia-suggestion-summary">' + _esc(sug.summary || "") + '</div>';

        // sourceExcerpt — the key feature
        if (sug.sourceExcerpt) {
          html += '<blockquote class="ia-source-excerpt">' + _esc(sug.sourceExcerpt) + '</blockquote>';
        }

        // payload details
        if (sug.payload) {
          var detail = sug.payload.detailedDescription || "";
          var tgs = sug.payload.tags || [];
          if (detail || tgs.length) {
            html += '<div class="ia-suggestion-extra">';
            if (detail) html += '<div class="ia-suggestion-desc">' + _esc(detail) + '</div>';
            if (tgs.length) html += '<div class="ia-suggestion-tags">' + tgs.map(function (t) { return '<span class="ia-tag">' + _esc(t) + '</span>'; }).join("") + '</div>';
            html += '</div>';
          }
        }

        html += '</div>';
      });

      html += '</div>';
    });

    _renderBody(html);
    _renderFooter(
      '<button class="ia-btn" id="ia-btn-back">🔄 重新选择</button>' +
      '<button class="ia-btn ia-btn-primary" id="ia-btn-confirm" ' + (sel === 0 ? "disabled" : "") + '>✅ 确认导入 (' + sel + ')</button>'
    );

    _$("ia-btn-confirm").addEventListener("click", _confirmImport);
    _$("ia-btn-back").addEventListener("click", _reset);
    var allSel = sel === s.length;
    _$("ia-select-all-btn").addEventListener("click", function () {
      var nv = !allSel;
      s.forEach(function (_, i) { if (nv) state.selectedIds[i] = true; else delete state.selectedIds[i]; });
      _renderResults();
    });

    _$("ia-modal-body").addEventListener("change", function (e) {
      if (e.target && e.target.type === "checkbox" && e.target.dataset.idx !== undefined) {
        var i = parseInt(e.target.dataset.idx);
        if (e.target.checked) state.selectedIds[i] = true; else delete state.selectedIds[i];
        var cnt = Object.keys(state.selectedIds).length;
        var cel = _$("ia-selected-count"); if (cel) cel.textContent = cnt;
        var btn = _$("ia-btn-confirm"); if (btn) { btn.textContent = "✅ 确认导入 (" + cnt + ")"; btn.disabled = cnt === 0; }
        var card = document.querySelector('.ia-suggestion-card[data-idx="' + i + '"]');
        if (card) { if (e.target.checked) card.classList.remove("ia-unchecked"); else card.classList.add("ia-unchecked"); }
      }
    });
  }

  // ── Confirming ──

  function _renderConfirming() {
    _renderBody('<div class="ia-center"><div class="ia-spinner"></div><div class="ia-status-text">⏳ 正在写入...</div></div>');
    _renderFooter(null);
  }

  // ── Done ──

  function _renderDone() {
    var r = state.confirmResult;
    if (!r) { _reset(); return; }
    var cls = r.totalErrors ? "ia-done-banner-warn" : "ia-done-banner-success";
    var icon = r.totalErrors ? "⚠️" : "✅";

    var html =
      '<div class="ia-done-banner ' + cls + '">' +
      '<div class="ia-done-icon">' + icon + '</div>' +
      '<div class="ia-done-text">成功导入 <strong>' + r.totalCreated + '</strong>/' + r.totalRequested + ' 个条目' +
      (r.totalErrors ? '，<span style="color:#c06060">' + r.totalErrors + ' 个失败</span>' : '') +
      '</div></div><div class="ia-done-detail">';

    r.created.forEach(function (item) {
      var targetLabel = item.target === "story-bible" ? "故事圣经" : item.target === "outline" ? "大纲" : "未来场景";
      html +=
        '<div class="ia-done-item"><span class="ia-done-item-icon">' + (TYPE_ICONS[item.type] || "📌") + '</span>' +
        '<span class="ia-done-item-name">' + _esc(item.name) + '</span>' +
        '<span class="ia-done-item-target">→ ' + targetLabel + '</span></div>';
    });

    if (r.errors.length) {
      html += '<div class="ia-done-errors"><div class="ia-done-errors-title">❌ 失败条目</div>';
      r.errors.forEach(function (e) {
        html += '<div class="ia-done-error-item"><span>' + _esc(e.name) + '</span>' +
          '<span style="color:#c06060;font-size:11px">' + _esc(e.error) + '</span></div>';
      });
      html += '</div>';
    }
    html += '</div>';

    _renderBody(html);
    _renderFooter(
      '<button class="ia-btn" id="ia-btn-continue">🔄 继续导入</button>' +
      '<button class="ia-btn ia-btn-primary" id="ia-btn-done-close">✅ 完成</button>'
    );
    _$("ia-btn-continue").addEventListener("click", _reset);
    _$("ia-btn-done-close").addEventListener("click", function () { ImportAssistant.close(); });
  }

  // ── API calls ──

  function _callAnalyze(content, fileName) {
    state.phase = "analyzing"; _renderAnalyzing();
    fetch("/api/import/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: state.projectId, content: content, fileName: fileName }),
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) {
        _toast("分析失败");
        _renderError("分析失败", result.error || "未知错误");
        return;
      }
      state.suggestions = result.data.suggestions;
      state.counts = result.data.counts;
      state._chunkCount = result.data.chunkCount;
      if (!state.suggestions.length) {
        _toast("未提取到有效条目");
        _renderError("未提取到有效条目", "AI 返回成功，但没有生成可导入的建议。可以尝试更长的文本，或检查后端日志中的原始 AI 响应。");
        return;
      }
      state.selectedIds = {};
      state.suggestions.forEach(function (_, i) { state.selectedIds[i] = true; });
      state.phase = "results"; _renderResults();
    })
    .catch(function (e) {
      _toast("网络错误");
      _renderError("网络错误", e.message);
    });
  }

  function _confirmImport() {
    state.phase = "confirming"; _renderConfirming();
    var selected = state.suggestions.filter(function (_, i) { return state.selectedIds[i]; });
    fetch("/api/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: state.projectId, items: selected }),
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) { _toast("导入失败: " + (result.error || "")); state.phase = "results"; _renderResults(); return; }

      // Write to KnowledgeSkill in-memory store for Story Bible visibility
      if (result.data.created && typeof KnowledgeSkill !== "undefined") {
        result.data.created.forEach(function (item) {
          try {
            // Character → add to Story Bible memory (also written to /api/characters by backend)
            if (item.type === "character") {
              KnowledgeSkill.create({
                projectId: state.projectId, type: "character", name: item.name,
                summary: item.attrs?.detailedDescription || "",
                tags: item.attrs?.tags || [],
                aliases: item.attrs?.aliases || [],
                attrs: { role: "配角", personality: item.attrs?.detailedDescription || "" },
              });
              return;
            }
            // Location → KnowledgeSkill with required attrs
            if (item.type === "location") {
              KnowledgeSkill.create({
                projectId: state.projectId, type: "location", name: item.name,
                summary: "", tags: item.attrs?.tags || [],
                attrs: { locationType: "其他" },
              });
              return;
            }
            // Faction → KnowledgeSkill with required attrs
            if (item.type === "faction") {
              KnowledgeSkill.create({
                projectId: state.projectId, type: "faction", name: item.name,
                summary: "", tags: item.attrs?.tags || [],
                attrs: { factionType: "其他" },
              });
              return;
            }
            // Rule → KnowledgeSkill with required attrs
            if (item.type === "rule") {
              KnowledgeSkill.create({
                projectId: state.projectId, type: "rule", name: item.name,
                summary: "", tags: item.attrs?.tags || [],
                attrs: { ruleCategory: "其他" },
              });
              return;
            }
          } catch (e) { /* silent — attrs validation may reject if incomplete */ }
        });
      }

      state.confirmResult = result.data;
      state.phase = "done"; _renderDone();
      _toast("✅ 成功导入 " + result.data.totalCreated + " 个条目");
    })
    .catch(function (e) { _toast("网络错误: " + e.message); state.phase = "results"; _renderResults(); });
  }

  function _reset() {
    state.phase = "upload"; state.suggestions = []; state.selectedIds = {};
    state.confirmResult = null; state._selectedFile = null; _renderUpload();
  }

  // ── Public API ──

  window.ImportAssistant = {
    open: function (projectId) {
      state.projectId = projectId || (typeof WarRoom !== "undefined" && WarRoom.getState ? WarRoom.getState().projectId : null) || null;
      _reset();
      _createModal();
      _renderUpload();
    },
    close: function () { _removeModal(); },
    getState: function () { return state; },
  };

})();
