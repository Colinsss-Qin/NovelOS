/* ================================================================
   AnalyzerReport — 右侧报告渲染：摘要 + 问题卡片列表
   ================================================================ */

var AnalyzerReport = {
  el: null,

  CATEGORY_LABELS: {
    personality: "性格一致性",
    ability: "能力一致性",
    age: "年龄一致性",
    relation: "关系冲突",
    behavior: "行为异常",
  },

  SEVERITY_LABELS: {
    severe: "严重",
    warning: "警告",
    info: "建议",
  },

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
  },

  /**
   * Show the analysis report.
   * @param {object} character
   * @param {object} result — { issues: [...] }
   */
  show: function (character, result) {
    if (!this.el) return;
    var issues = (result && result.issues) || [];
    var self = this;

    var severeCount = issues.filter(function (i) { return i.severity === "severe"; }).length;
    var warnCount = issues.filter(function (i) { return i.severity === "warning"; }).length;
    var infoCount = issues.filter(function (i) { return i.severity === "info"; }).length;

    var html = '<div class="ca-report">';

    // Header
    html +=
      '<div class="ca-report-header">' +
      '<div class="ca-report-character">' + _esc(character.name) + " — 一致性报告</div>" +
      '<div class="ca-report-meta">' +
      "检查了 " + issues.length + " 个问题点 · " +
      Object.keys(self.CATEGORY_LABELS).length + " 个类别" +
      "</div>" +
      "</div>";

    // Summary chips
    html += '<div class="ca-report-summary">';
    html += '<span class="ca-summary-chip severe">🔴 严重 ' + severeCount + "</span>";
    html += '<span class="ca-summary-chip warning">🟠 警告 ' + warnCount + "</span>";
    html += '<span class="ca-summary-chip info">🔵 建议 ' + infoCount + "</span>";
    html += "</div>";

    // Issues
    if (issues.length === 0) {
      html +=
        '<div style="padding:40px;text-align:center;color:#5aab8a">' +
        '<div style="font-size:36px;margin-bottom:10px">✅</div>' +
        '<div>未发现一致性问题</div>' +
        "</div>";
    } else {
      issues.forEach(function (issue) {
        html += self._renderIssue(issue);
      });
    }

    html += "</div>";
    this.el.innerHTML = html;
  },

  showEmpty: function () {
    if (!this.el) return;
    this.el.innerHTML =
      '<div class="ca-empty">' +
      '<div class="ca-empty-icon">🔍</div>' +
      '<div class="ca-empty-text">选择角色和章节后，点击「开始分析」<br>检查角色一致性</div>' +
      "</div>";
  },

  _renderIssue: function (issue) {
    var sev = issue.severity || "info";
    var cat = issue.category || "unknown";
    var catLabel = this.CATEGORY_LABELS[cat] || cat;
    var sevLabel = this.SEVERITY_LABELS[sev] || sev;

    return (
      '<div class="ca-issue-card ' + sev + '">' +
      '<div class="ca-issue-header">' +
      '<span class="ca-issue-category">' + catLabel + "</span>" +
      '<span class="ca-issue-severity ' + sev + '">' + sevLabel + "</span>" +
      "</div>" +
      '<div class="ca-issue-title">' + _esc(issue.title || "") + "</div>" +
      (issue.description ? '<div class="ca-issue-desc">' + _esc(issue.description) + "</div>" : "") +
      (issue.quote && issue.quote.indexOf("（请将章节内容") === -1
        ? '<div class="ca-issue-quote">' + _esc(issue.quote) + "</div>"
        : "") +
      (issue.suggestion
        ? '<div class="ca-issue-suggestion"><strong>💡 修改建议：</strong>' + _esc(issue.suggestion) + "</div>"
        : "") +
      "</div>"
    );
  },
};
