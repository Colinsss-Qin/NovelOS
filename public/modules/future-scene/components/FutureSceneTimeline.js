/* ================================================================
   FutureSceneTimeline — Timeline view (sorted by expected chapter)
   ================================================================ */

var FutureSceneTimeline = {
  el: null,
  onCardClick: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (timelineData, chapterNames) {
    if (!this.el) return;
    var scenes = timelineData || [];
    var chMap = chapterNames || {};

    if (scenes.length === 0) {
      this.el.innerHTML = '<div class="fs-empty"><div class="fs-empty-icon">📅</div><div class="fs-empty-text">暂无关联章节的场景</div><div class="fs-empty-sub">为场景指定预计章节后，将在此显示时间线</div></div>';
      return;
    }

    var self = this;
    var html = '<div class="fs-timeline"><div class="fs-timeline-line"></div>';

    // Group by (volume) + chapter
    var currentChapter = null;

    scenes.forEach(function (s) {
      var ch = s.expectedChapter;
      var chapterLabel = "";
      if (ch) {
        if (ch.volume) {
          chapterLabel = ch.volume.title + " · " + ch.title;
        } else {
          chapterLabel = ch.title;
        }
      } else {
        chapterLabel = "未指定章节";
      }

      // Chapter divider
      if (currentChapter !== chapterLabel) {
        currentChapter = chapterLabel;
        html += '<div class="fs-timeline-chapter">';
        html += '<div class="fs-timeline-dot-big"></div>';
        html += '<div class="fs-timeline-chapter-label">📘 ' + _esc(chapterLabel) + '</div>';
        html += '</div>';
      }

      // Scene node
      var impIcons = { high: "★", medium: "●", low: "○" };
      var impIcon = impIcons[s.importance] || "●";
      html += '<div class="fs-timeline-item" data-id="' + s.id + '">';
      html += '<div class="fs-timeline-dot"></div>';
      html += '<div class="fs-timeline-card">';
      html += '<div class="fs-timeline-card-header">';
      html += '<span class="fs-imp-' + (s.importance || "medium") + '">' + impIcon + '</span>';
      html += '<span class="fs-timeline-card-title">' + _esc(s.title) + '</span>';
      html += '</div>';
      html += '<div class="fs-timeline-card-meta">';
      if (s.sceneType)   html += '<span class="fs-tag">' + _esc(s.sceneType) + '</span>';
      if (s.emotionGoal) html += '<span>🎯 ' + _esc(s.emotionGoal) + '</span>';
      html += '<span class="fs-status-badge" style="background:' + _statusColor(s.status) + '">' + (s.status || "构思中") + '</span>';
      html += '</div>';
      if (s.summary) {
        html += '<div class="fs-timeline-card-summary">' + _esc(s.summary.length > 80 ? s.summary.slice(0, 80) + "..." : s.summary) + '</div>';
      }
      html += '</div></div>';
    });

    html += '</div>';
    this.el.innerHTML = html;
    this._bind();
  },

  _bind: function () {
    var self = this;
    this.el.querySelectorAll(".fs-timeline-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = this.parentElement.getAttribute("data-id");
        if (id && self.onCardClick) self.onCardClick(id);
      });
    });
  },
};

function _statusColor(status) {
  var map = { "构思中": "#6b6880", "规划中": "#d4a574", "推进中": "#6b9aed", "已完成": "#5aab8a", "废弃": "#c06060" };
  return map[status] || "#6b6880";
}
