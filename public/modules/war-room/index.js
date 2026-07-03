/* ================================================================
   War Room Module — 作战室（项目仪表盘）
   window.WarRoom = { init, refresh, getState }
   ================================================================ */

(function () {
  "use strict";

  var state = { projectId: "proj_demo", data: null };
  var container = null;

  // ── Helpers ──

  function _esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function _statusColor(status) {
    var map = { "构思中": "#6b6880", "规划中": "#d4a574", "推进中": "#6b9aed", "已完成": "#5aab8a", "废弃": "#c06060" };
    return map[status] || "#6b6880";
  }

  // ── Render ──

  function _render() {
    if (!container) return;
    var d = state.data;
    if (!d) {
      container.innerHTML = '<div style="padding:60px;text-align:center;color:#6b6880">⏳ 加载作战室数据...</div>';
      return;
    }

    var p = d.project;
    var prog = d.progress;
    var cv = d.currentVolume;
    var cc = d.currentChapter;
    var st = d.stats;
    var fsStats = st.futureScenes;

    container.innerHTML =
      '<div class="wr-dashboard">' +

      // ── Header ──
      '<div class="wr-header">' +
      '<div class="wr-project-name">' + _esc(p.name) + '</div>' +
      '<div class="wr-project-genre">' + _esc(p.genre) + '</div>' +
      '</div>' +

      // ── Progress ──
      '<div class="wr-section">' +
      '<div class="wr-section-title">📊 写作进度</div>' +
      '<div class="wr-progress-bar-wrap">' +
      '<div class="wr-progress-bar" style="width:' + prog.percent + '%;"></div>' +
      '</div>' +
      '<div class="wr-progress-text">' + prog.finalizedChapters + ' / ' + prog.totalChapters + ' 章已完成（' + prog.percent + '%）</div>' +
      (cv ? '<div class="wr-current-info"><span>📘 当前卷：' + _esc(cv.title) + '</span>' + (cc ? '<span>  ·  📄 当前章节：' + _esc(cc.title) + '</span>' : '') + '</div>' : '') +
      '</div>' +

      // ── Stats Cards ──
      '<div class="wr-section">' +
      '<div class="wr-section-title">📈 数据概览</div>' +
      '<div class="wr-cards">' +

      // Card 1: Story Bible
      '<div class="wr-card">' +
      '<div class="wr-card-icon">📚</div>' +
      '<div class="wr-card-value">' + st.bibleEntries + '</div>' +
      '<div class="wr-card-label">故事圣经条目</div>' +
      '</div>' +

      // Card 2: Outline Nodes
      '<div class="wr-card">' +
      '<div class="wr-card-icon">🗂️</div>' +
      '<div class="wr-card-value">' + (st.outlineNodes.volumes + st.outlineNodes.chapters) + '</div>' +
      '<div class="wr-card-label">大纲节点（' + st.outlineNodes.volumes + '卷' + st.outlineNodes.chapters + '章）</div>' +
      '</div>' +

      // Card 3: Future Scenes
      '<div class="wr-card">' +
      '<div class="wr-card-icon">🔮</div>' +
      '<div class="wr-card-value">' + fsStats.total + '</div>' +
      '<div class="wr-card-label">未来场景</div>' +
      '<div class="wr-card-detail">' +
      '<span style="color:#6b6880">💡' + (fsStats["构思中"] || 0) + '</span> ' +
      '<span style="color:#6b9aed">🚀' + (fsStats["推进中"] || 0) + '</span> ' +
      '<span style="color:#5aab8a">✅' + (fsStats["已完成"] || 0) + '</span>' +
      '</div>' +
      '</div>' +

      // Card 4: Total Words
      '<div class="wr-card">' +
      '<div class="wr-card-icon">✍️</div>' +
      '<div class="wr-card-value">' + _formatWords(st.totalWords) + '</div>' +
      '<div class="wr-card-label">总字数</div>' +
      '</div>' +

      '</div></div>' + // /cards /section

      // ── Quick Actions ──
      '<div class="wr-section">' +
      '<div class="wr-section-title">⚡ 快捷入口</div>' +
      '<div class="wr-actions">' +
      '<button class="wr-action-btn" onclick="LayoutSkill.switchTab(\'studio\', document.querySelector(\'[data-tab=studio]\'))">✍️ 继续写作</button>' +
      '<button class="wr-action-btn" onclick="LayoutSkill.switchTab(\'outline\', document.querySelector(\'[data-tab=outline]\'))">🗂️ 完善大纲</button>' +
      '<button class="wr-action-btn" onclick="LayoutSkill.switchTab(\'bible\', document.querySelector(\'[data-tab=bible]\'))">📚 整理设定</button>' +
      '<button class="wr-action-btn" onclick="ImportAssistant.open()">📥 导入文档</button>' +
      '</div>' +
      '</div>' +

      '</div>'; // /dashboard
  }

  function _formatWords(n) {
    if (!n || n === 0) return "0";
    if (n >= 10000) return (n / 10000).toFixed(1) + " 万";
    return n.toLocaleString ? n.toLocaleString() : String(n);
  }

  // ── Data Fetching ──

  function _loadData() {
    fetch("/api/projects/" + encodeURIComponent(state.projectId) + "/dashboard")
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.success) {
          state.data = result.data;
          _render();
        } else {
          container.innerHTML = '<div style="padding:40px;color:#c06060;text-align:center"><h3>加载失败</h3><p>' + _esc(result.error || "未知错误") + '</p></div>';
        }
      })
      .catch(function (e) {
        container.innerHTML = '<div style="padding:40px;color:#c06060;text-align:center"><h3>网络错误</h3><p>' + _esc(e.message) + '</p></div>';
      });
  }

  // ── Public API ──

  window.WarRoom = {
    init: function (containerId, projectId) {
      try {
        container = document.getElementById(containerId);
        if (!container) { console.error("WarRoom: container #" + containerId + " not found"); return; }
        state.projectId = projectId || "proj_demo";
        container.innerHTML = '<div style="padding:60px;text-align:center;color:#6b6880">⏳ 加载中...</div>';
        _loadData();
      } catch (e) {
        if (container) container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>初始化错误</h3><pre>' + e.message + '</pre></div>';
        console.error("WarRoom init error:", e);
      }
    },

    refresh: function () {
      if (!container) return;
      _loadData();
    },

    getState: function () { return state; },
  };

})();
