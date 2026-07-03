/* ================================================================
   AnalyzerService — AI prompt builder + /api/generate caller
   ================================================================ */

var AnalyzerService = {
  /**
   * Build a system prompt for character consistency analysis.
   */
  buildSystemPrompt: function (character, relations, categories) {
    var catLabels = {
      personality: "性格一致性",
      ability: "能力一致性",
      age: "年龄一致性",
      relation: "关系冲突",
      behavior: "行为异常",
    };

    var selectedCats = categories
      .map(function (c) { return catLabels[c] || c; })
      .join("、");

    // Build character profile
    var profile = [
      "## 角色设定",
      "姓名：" + character.name,
      character.alias ? "别名：" + character.alias : "",
      "性别：" + (character.gender || "未知"),
      "年龄：" + (character.age > 0 ? character.age + "岁" : "未知"),
      "种族：" + (character.race || "未知"),
      "职业：" + (character.occupation || "未知"),
      "性格：" + (character.personality || "无"),
      "背景：" + (character.background || "无"),
      "目标：" + (character.goal || "无"),
      "动机：" + (character.motivation || "无"),
    ]
      .filter(Boolean)
      .join("\n");

    // Build relations
    var relText = "## 角色关系\n";
    if (relations.length === 0) {
      relText += "（无已记录关系）\n";
    } else {
      relations.forEach(function (r) {
        relText += "- " + r.relationType + "：" + (r.otherName || r.targetCharacterId) + "\n";
      });
    }

    return [
      "你是一个小说编辑AI，专门检查角色设定的前后一致性。",
      "",
      profile,
      "",
      relText,
      "",
      "## 分析要求",
      "请仅检查以下类别：" + selectedCats,
      "",
      "## 输出格式",
      "请严格按照以下 JSON 格式输出，不要包含任何其他内容：",
      "{",
      '  "issues": [',
      '    {',
      '      "category": "personality",',
      '      "severity": "warning",',
      '      "title": "问题标题",',
      '      "description": "问题描述",',
      '      "quote": "相关原文引用",',
      '      "suggestion": "修改建议"',
      "    }",
      "  ]",
      "}",
      "",
      'category 必须是以下之一：personality, ability, age, relation, behavior',
      'severity 必须是以下之一：severe, warning, info',
      '如果没有发现问题，返回 { "issues": [] }',
    ].join("\n");
  },

  /**
   * Call /api/generate with the analysis prompt.
   * @returns {Promise<object>} parsed JSON with issues array
   */
  analyze: function (character, relations, chapters, categories) {
    var systemPrompt = this.buildSystemPrompt(character, relations, categories);

    var chapterTexts = chapters
      .map(function (ch) { return "## " + ch.title + "\n" + (ch.content || ""); })
      .join("\n\n");

    var userPrompt = [
      "请分析以下章节内容，检查角色「" + character.name + "」的一致性。",
      "",
      chapterTexts,
      "",
      "请输出 JSON 格式的分析报告。",
    ].join("\n");

    return fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        maxTokens: 4096,
        temperature: 0.3,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return _readStream(res);
      })
      .then(function (fullText) {
        return _parseResponse(fullText);
      });
  },

  /**
   * Generate a demo report (fallback when AI unavailable).
   */
  generateDemo: function (character, relations) {
    var issues = [];

    // Always generate a personality consistency check
    if (character.personality) {
      issues.push({
        category: "personality",
        severity: "warning",
        title: "性格表现需要核实",
        description:
          "角色「" + character.name + "」在设定中被描述为「" + character.personality.slice(0, 30) + "…」，建议检查章节中是否有不符合该性格特征的行为描写。",
        quote: "（请将章节内容粘贴到左侧，使用 AI 分析获取具体引用）",
        suggestion:
          "如果发现不一致，可以修改原文中不符合性格的对白或行为，或者更新角色设定以反映角色成长带来的性格变化。",
      });
    }

    if (character.age > 0) {
      issues.push({
        category: "age",
        severity: "info",
        title: "年龄与行为匹配检查",
        description:
          "角色设定年龄为 " + character.age + " 岁。请确认章节中该角色的言行、社会地位、能力水平是否与其年龄相符。",
        quote: "（请将章节内容粘贴到左侧，使用 AI 分析获取具体引用）",
        suggestion:
          "年龄相关的行为偏差可能是角色设定不一致的信号。如果角色行为显得过于成熟或幼稚，考虑调整年龄设定或添加合理的背景解释。",
      });
    }

    if (relations.length > 0) {
      var relNames = relations
        .slice(0, 3)
        .map(function (r) { return r.relationType + "：" + (r.otherName || ""); })
        .join("、");

      issues.push({
        category: "relation",
        severity: "warning",
        title: "关系动态检查",
        description:
          "角色与以下人物存在关系：" +
          relNames +
          "。请确认章节中这些关系的互动方式是否与设定一致，是否有未经铺垫的关系突变。",
        quote: "（请将章节内容粘贴到左侧，使用 AI 分析获取具体引用）",
        suggestion:
          "关系发展应该循序渐进。如果出现了突兀的关系转折（如突然成为敌人/恋人），需要在前文添加铺垫或伏笔。",
      });
    }

    if (character.goal) {
      issues.push({
        category: "behavior",
        severity: "info",
        title: "目标驱动行为检查",
        description: '角色目标是「' + character.goal + '」。请确认章节中该角色的行动是否在推动目标实现，或者有合理的偏离原因。',
        quote: "（请将章节内容粘贴到左侧，使用 AI 分析获取具体引用）",
        suggestion:
          "每个场景中角色的行动应该有明确动机。如果角色行为与目标不符，要么添加内外部阻力来解释，要么调整角色当下的小目标。",
      });
    }

    return { issues: issues };
  },
};

// ═══════════════════════════════════
//  INTERNAL
// ═══════════════════════════════════

function _readStream(response) {
  var reader = response.body.getReader();
  var decoder = new TextDecoder();
  var buffer = "";
  var result = "";

  return new Promise(function (resolve, reject) {
    function read() {
      reader.read().then(function (chunk) {
        if (chunk.done) {
          resolve(result);
          return;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop() || "";
        lines.forEach(function (line) {
          if (!line.startsWith("data: ")) return;
          try {
            var json = JSON.parse(line.slice(6));
            if (json.token) result += json.token;
            if (json.error) reject(new Error(json.error));
          } catch (e) {}
        });
        read();
      }).catch(reject);
    }
    read();
  });
}

function _parseResponse(raw) {
  var text = raw.trim();

  // Strip markdown fences
  var m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) text = m[1].trim();

  // Find JSON boundaries
  var start = text.indexOf("{");
  var end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  try {
    var parsed = JSON.parse(text);
    if (parsed.issues && Array.isArray(parsed.issues)) {
      return parsed;
    }
    throw new Error("Missing issues array");
  } catch (e) {
    console.warn("AnalyzerService: failed to parse AI response, raw:", raw.slice(0, 200));
    throw new Error("AI 返回格式异常，请重试");
  }
}
