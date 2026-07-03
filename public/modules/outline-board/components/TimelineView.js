/* ================================================================
   TimelineView — 时间线视图（按卷→章→场景顺序展示）
   ================================================================ */

var TimelineView = {
  el: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  render: function (tree) {
    if (!this.el) return;
    if (!tree || !tree.volumes || tree.volumes.length === 0) {
      this.el.innerHTML = '<div class="ob-tree-empty">暂无大纲数据</div>';
      return;
    }

    var html = '<div class="ob-timeline">';
    html += '<div style="font-size:16px;font-weight:700;color:#d0cec8;margin-bottom:16px">📅 ' + _esc(tree.story.title) + ' — 时间线</div>';
    html += '<div class="ob-timeline-line"></div>';

    var itemIndex = 0;
    var self = this;
    tree.volumes.forEach(function (vol) {
      html += self._renderVolumeDot(vol, ++itemIndex);
      (vol.chapters || []).forEach(function (ch) {
        html += self._renderChapterItem(ch, vol.title, ++itemIndex);
      });
    });

    html += '</div>';
    this.el.innerHTML = html;
  },

  _renderVolumeDot: function (vol, idx) {
    return (
      '<div class="ob-timeline-item">' +
      '<div class="ob-timeline-dot"></div>' +
      '<div class="ob-timeline-vol">第 ' + idx + ' 卷</div>' +
      '<div class="ob-timeline-title">📘 ' + _esc(vol.title) + '</div>' +
      '<div class="ob-timeline-summary">' + (vol.chapters ? vol.chapters.length : 0) + ' 个章节</div>' +
      '</div>'
    );
  },

  _renderChapterItem: function (ch, volTitle, idx) {
    var statusClass = ch.status || '未开始';
    var sceneList = '';
    if (ch.scenes && ch.scenes.length > 0) {
      sceneList = '<div class="ob-timeline-scenes">';
      ch.scenes.forEach(function (sc) {
        sceneList +=
          '<div class="ob-timeline-scene">' +
          '<div class="ob-timeline-dot scene"></div>' +
          '🎬 ' + _esc(sc.title) +
          (sc.conflict ? ' <span style="color:#c06060;font-size:10px">冲突: ' + _esc(sc.conflict.slice(0, 20)) + '</span>' : '') +
          '</div>';
      });
      sceneList += '</div>';
    }

    return (
      '<div class="ob-timeline-item">' +
      '<div class="ob-timeline-dot" style="border-color:' + (statusClass === '完成' ? '#5aab8a' : statusClass === '写作中' ? '#d4a574' : '#6b6880') + '"></div>' +
      '<div class="ob-timeline-vol">' + _esc(volTitle) + ' · ' + statusClass + '</div>' +
      '<div class="ob-timeline-title">📄 ' + _esc(ch.title) + '</div>' +
      (ch.summary ? '<div class="ob-timeline-summary">' + _esc(ch.summary) + '</div>' : '') +
      (ch.goal ? '<div class="ob-timeline-summary" style="color:#d4a574">🎯 ' + _esc(ch.goal) + '</div>' : '') +
      sceneList +
      '</div>'
    );
  },
};
