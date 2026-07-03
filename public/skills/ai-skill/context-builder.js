/* ================================================================
   AI Skill / Context Builder
   Retrieves, assembles, and trims context for AI generation.
   Uses KnowledgeSkill as the data source.
   ================================================================ */

// ================================================================
//  TOKEN BUDGET (migrated from src/lib/ai/context/budget.ts)
// ================================================================

/**
 * Rough token estimation: Chinese ~1.5 chars/tok, English ~4 chars/tok.
 */
function estimateTokens(text) {
  if (!text) return 0;
  var chinese = (text.match(/[一-鿿]/g) || []).length;
  var other = text.replace(/[一-鿿]/g, "").length;
  return Math.ceil(chinese / 1.5 + other / 4);
}

/**
 * Assemble context items with token budget trimming.
 * Items sorted by priority (1=highest), lower priority trimmed first.
 * @param {Array<{priority:number, title:string, content:string}>} items
 * @param {number} maxTokens
 * @returns {string}
 */
function assembleWithBudget(items, maxTokens) {
  var sorted = items.slice().sort(function (a, b) { return a.priority - b.priority; });
  var sections = [];
  var used = 0;

  for (var i = 0; i < sorted.length; i++) {
    var item = sorted[i];
    var tok = estimateTokens(item.content);
    if (used + tok <= maxTokens) {
      sections.push(item.content);
      used += tok;
    } else {
      var remaining = maxTokens - used;
      if (remaining > 100) {
        var charBudget = Math.floor(remaining * 3);
        sections.push(item.content.slice(0, charBudget) + "\n[已截断...]");
      }
      break;
    }
  }

  return sections.join("\n\n---\n\n");
}

// ================================================================
//  CONTEXT BUILDER
// ================================================================

var ContextBuilder = {

  /**
   * Build the full context for a generation task.
   * @param {object} opts
   * @param {string} opts.task       — AITask value
   * @param {string} opts.projectId
   * @param {object} opts.chapter    — chapter object (from novelData)
   * @param {string} [opts.selectedText]
   * @param {object} [opts.knowledge] — KnowledgeSkill instance
   * @returns {{ systemPrompt: string, userPrompt: string, sources: object[] }}
   */
  build: function (opts) {
    var task    = opts.task;
    var chapter = opts.chapter || {};
    var knowledge = opts.knowledge;

    // ---- Collect context items with priorities ----
    var items = [];

    // Priority 1: Chapter seed (always first)
    items.push({
      priority: 1,
      title: "当前章节",
      content: "## 当前章节\n标题：" + (chapter.title || "未知") +
               "\n剧情种子：" + (chapter.seed || chapter.summary || "（无）") +
               "\n当前字数：" + (chapter.wordCount || 0)
    });

    // Priority 2: Characters involved in this chapter
    if (chapter.characters && chapter.characters.length > 0) {
      var charTexts = chapter.characters.map(function (c) {
        return "【" + c.name + "】" + c.role + "\n" + (c.desc || "");
      });
      items.push({
        priority: 2,
        title: "涉及角色",
        content: "## 涉及角色\n\n" + charTexts.join("\n\n")
      });
    }

    // Priority 3: Volume summary
    if (chapter._volumeTitle) {
      items.push({
        priority: 3,
        title: "当前卷",
        content: "## 当前卷：" + chapter._volumeTitle
      });
    }

    // Priority 6: Related settings
    if (chapter.settings && chapter.settings.length > 0) {
      var settingTexts = chapter.settings.map(function (s) {
        return "【" + s.category + "】" + s.name + "\n" + s.desc;
      });
      items.push({
        priority: 6,
        title: "相关设定",
        content: "## 相关设定\n\n" + settingTexts.join("\n\n")
      });
    }

    // ---- Assemble with budget ----
    var maxTokens = 8000;
    var assembledContext = assembleWithBudget(items, maxTokens);

    // ---- Render prompt via PromptManager ----
    var vars = {
      "context.assembled": assembledContext,
      "chapter.title":     chapter.title || "",
      "chapter.seed":      chapter.seed || chapter.summary || "",
      "project.name":      opts.projectName || "",
      "project.genre":     opts.projectGenre || "",
      "selectedText":      opts.selectedText || "",
      "targetType":        opts.targetType || "章节"
    };

    var rendered = PromptManager.render(task, vars);

    return {
      systemPrompt: rendered.system,
      userPrompt:   rendered.user,
      sources:      items
    };
  },

  /**
   * Retrieve context sources only (for UI display), no prompt rendering.
   */
  retrieve: function (chapter) {
    var items = [];
    if (!chapter) return items;

    if (chapter.characters) {
      chapter.characters.forEach(function (c) {
        items.push({ type: "character", name: c.name, desc: c.desc, role: c.role });
      });
    }
    if (chapter.settings) {
      chapter.settings.forEach(function (s) {
        items.push({ type: "setting", name: s.name, category: s.category, desc: s.desc });
      });
    }
    if (chapter._volumeTitle) {
      items.push({ type: "volume", name: chapter._volumeTitle });
    }
    if (chapter.wordCount) {
      items.push({ type: "meta", wordCount: chapter.wordCount, status: chapter.status });
    }

    return items;
  },

  /** @inheritdoc */
  estimateTokens: estimateTokens
};
