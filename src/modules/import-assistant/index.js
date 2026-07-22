/* ================================================================
   Import Assistant V2 — 导入助手
   POST /api/import/analyze  — chunk → AI → merge → suggestions
   POST /api/import/confirm  — write to correct backend per type
   ================================================================ */

const express = require("express");
const router = express.Router();
const { chunk, analyzeChunks, merge, countByType } = require("./chunker");

// ── Check API key (import only, does NOT affect /api/generate) ──
function _requireApiKey() {
  if (!process.env.KIMI_API_KEY) {
    const err = new Error("未配置 KIMI_API_KEY，导入助手需要 Kimi API。请在 .env 中设置 KIMI_API_KEY");
    err.status = 503;
    err.expose = true;
    throw err;
  }
}

// ── POST /api/import/analyze ──
router.post("/analyze", async (req, res, next) => {
  try {
    const { projectId, content, fileName, files } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, error: "projectId is required" });

    // 多文件模式：合并所有文件内容带分隔标记
    let finalContent = content;
    let finalFileName = fileName || "未命名文档";
    let fileCount = 1;

    if (files && Array.isArray(files) && files.length > 1) {
      finalContent = files.map(function (f) {
        return "\n\n=== 文档：" + (f.fileName || "未命名") + " ===\n\n" + (f.content || "");
      }).join("");
      finalFileName = files.length + " 个文件";
      fileCount = files.length;
    }

    if (!finalContent || !finalContent.trim())
      return res.status(400).json({ success: false, error: "content is required" });

    _requireApiKey();

    // 1. Chunk
    const chunks = chunk(finalContent, 4000);

    // 2. Analyze each chunk via Kimi (max 3 concurrent)
    const chunkResults = await analyzeChunks(chunks);

    // 3. Check for any successful results
    const totalErrors = chunkResults.filter((r) => r.error).length;
    if (totalErrors === chunkResults.length) {
      return res.status(500).json({
        success: false,
        error: "所有分块分析均失败: " + (chunkResults[0]?.error || "未知错误"),
      });
    }

    // 4. Merge + dedup + conflict detection
    const suggestions = merge(chunkResults, fileCount);
    const counts = countByType(suggestions);

    res.json({
      success: true,
      data: {
        sourceFile: finalFileName,
        fileCount: fileCount,
        totalCount: suggestions.length,
        chunkCount: chunks.length,
        chunkErrors: totalErrors,
        suggestions,
        counts,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/import/confirm ──
router.post("/confirm", async (req, res, next) => {
  try {
    const { projectId, items } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, error: "projectId is required" });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "items array is required" });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await _createItem(projectId, item);
        created.push(result);
      } catch (err) {
        errors.push({
          index: i,
          name: item.title || item.name || "(unnamed)",
          type: item.type,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        created,
        errors,
        totalRequested: items.length,
        totalCreated: created.length,
        totalErrors: errors.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Helpers: find existing entity by exact name ──

async function _findExistingCharacter(projectId, name, baseUrl) {
  try {
    const resp = await fetch(baseUrl + "/api/characters?projectId=" + encodeURIComponent(projectId));
    const result = await resp.json();
    if (!result.success || !result.data) return null;
    const normalized = name.trim();
    return result.data.find(function (c) {
      if (c.name.trim() === normalized) return true;
      if (c.alias) {
        return c.alias.split(/[,，、]/).some(function (a) { return a.trim() === normalized; });
      }
      return false;
    }) || null;
  } catch (_) { return null; }
}

async function _findExistingItem(projectId, type, name, baseUrl) {
  try {
    const resp = await fetch(
      baseUrl + "/api/items?projectId=" + encodeURIComponent(projectId) +
      "&type=" + encodeURIComponent(type) + "&limit=200"
    );
    const result = await resp.json();
    if (!result.success || !result.data || !result.data.items) return null;
    const normalized = name.trim();
    return result.data.items.find(function (item) {
      if (item.name.trim() === normalized) return true;
      if (item.aliases) {
        return item.aliases.split(",").some(function (a) { return a.trim() === normalized; });
      }
      return false;
    }) || null;
  } catch (_) { return null; }
}

function _mergeTags(existing, incoming) {
  var existingList = existing
    ? (Array.isArray(existing) ? existing : String(existing).split(",").map(function (s) { return s.trim(); }))
    : [];
  var incomingList = Array.isArray(incoming) ? incoming : [];
  var merged = existingList.slice();
  incomingList.forEach(function (t) {
    if (t && merged.indexOf(t) === -1) merged.push(t);
  });
  return merged;
}

function _mergeAliases(existing, incoming) {
  return _mergeTags(existing, incoming);
}

function _mergeText(existing, incoming) {
  if (!incoming || !incoming.trim()) return existing || "";
  if (!existing || !existing.trim()) return incoming.trim();
  // If incoming is already contained in existing, keep existing
  if (existing.indexOf(incoming.trim()) !== -1) return existing;
  // If existing is shorter than 10 chars, just replace
  if (existing.trim().length < 10) return incoming.trim();
  // Otherwise append with separator
  return existing.trim() + "\n\n---\n" + incoming.trim();
}

// ── Write to correct backend per type ──

async function _createItem(projectId, item) {
  const type = item.type;
  const title = (item.title || item.name || "").trim();
  const summary = item.summary || "";
  const description = item.payload?.detailedDescription || item.description || "";
  const tags = item.payload?.tags || item.tags || [];
  const aliases = item.payload?.aliases || item.aliases || [];
  const baseUrl = "http://localhost:" + (process.env.PORT || 3000);

  // ── Character → POST /api/characters (Character Manager reads this) ──
  if (type === "character") {
    const existing = await _findExistingCharacter(projectId, title, baseUrl);

    // 从 AI 提取的 payload 中读取新字段
    const speakingStyle = item.payload?.speakingStyle || "";
    const behaviorLogic = item.payload?.behaviorLogic || "";
    const forbidden = item.payload?.forbidden || "";

    if (existing) {
      // Merge with existing character
      const mergedAliases = _mergeAliases(
        existing.alias ? existing.alias.split(/[,，、]/).map(function (s) { return s.trim(); }) : [],
        [title].concat(aliases).filter(function (a) { return a && a !== existing.name; })
      );
      const mergedBackground = _mergeText(existing.background, description);
      const newPersonality = description.slice(0, 200);
      const mergedPersonality = (newPersonality.length > (existing.personality || "").length)
        ? newPersonality : (existing.personality || "");

      const putBody = {
        background: mergedBackground,
        personality: mergedPersonality,
        alias: mergedAliases.length > 0 ? mergedAliases[0] : existing.alias,
      };
      if (description.length > 200) {
        putBody.appearance = description;
      }
      // 新字段：仅当 AI 提取到内容时才覆盖
      if (speakingStyle) putBody.speakingStyle = _mergeText(existing.speakingStyle, speakingStyle);
      if (behaviorLogic) putBody.behaviorLogic = _mergeText(existing.behaviorLogic, behaviorLogic);
      if (forbidden) putBody.forbidden = _mergeText(existing.forbidden, forbidden);

      const resp = await fetch(baseUrl + "/api/characters/" + encodeURIComponent(existing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(putBody),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "更新角色失败");
      return { id: result.data?.id, type, name: title, target: "character-manager", _action: "merged" };
    }

    // Create new
    const resp = await fetch(baseUrl + "/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: title,
        alias: aliases.length > 0 ? aliases[0] : "",
        personality: description.slice(0, 200),
        background: description,
        speakingStyle: speakingStyle,
        behaviorLogic: behaviorLogic,
        forbidden: forbidden,
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建角色失败");
    return { id: result.data?.id, type, name: title, target: "character-manager", _action: "created" };
  }

  // ── Location → POST /api/items (Story Bible reads this) ──
  if (type === "location") {
    const existing = await _findExistingItem(projectId, "location", title, baseUrl);

    if (existing) {
      const mergedTags = _mergeTags(existing.tags, tags);
      const mergedAliases = _mergeAliases(existing.aliases, aliases);
      const mergedDesc = _mergeText(existing.description, description);

      const resp = await fetch(baseUrl + "/api/items/" + encodeURIComponent(existing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mergedDesc,
          tags: mergedTags,
          aliases: mergedAliases,
          attrs: { locationType: summary || "其他", description: mergedDesc, tags: mergedTags },
        }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "更新地点失败");
      return { id: result.data?.id, type, name: title, target: "story-bible", _action: "merged" };
    }

    const resp = await fetch(baseUrl + "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId, type: "location", name: title,
        summary: summary, description: description,
        tags: tags, aliases: aliases,
        attrs: { locationType: summary || "其他", description: description, tags: tags },
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建地点失败");
    return { id: result.data?.id, type, name: title, target: "story-bible", _action: "created" };
  }

  // ── Faction → POST /api/items ──
  if (type === "faction") {
    const existing = await _findExistingItem(projectId, "faction", title, baseUrl);

    if (existing) {
      const mergedTags = _mergeTags(existing.tags, tags);
      const mergedAliases = _mergeAliases(existing.aliases, aliases);
      const mergedDesc = _mergeText(existing.description, description);

      const resp = await fetch(baseUrl + "/api/items/" + encodeURIComponent(existing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mergedDesc,
          tags: mergedTags,
          aliases: mergedAliases,
          attrs: { factionType: summary || "其他", description: mergedDesc, tags: mergedTags },
        }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "更新势力失败");
      return { id: result.data?.id, type, name: title, target: "story-bible", _action: "merged" };
    }

    const resp = await fetch(baseUrl + "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId, type: "faction", name: title,
        summary: summary, description: description,
        tags: tags, aliases: aliases,
        attrs: { factionType: summary || "其他", description: description, tags: tags },
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建势力失败");
    return { id: result.data?.id, type, name: title, target: "story-bible", _action: "created" };
  }

  // ── Rule / Lore → POST /api/items ──
  if (type === "rule" || type === "lore") {
    const dbType = type === "lore" ? "history_event" : "rule";
    const existing = await _findExistingItem(projectId, dbType, title, baseUrl);

    if (existing) {
      const mergedTags = _mergeTags(existing.tags, tags);
      const mergedAliases = _mergeAliases(existing.aliases, aliases);
      const mergedDesc = _mergeText(existing.description, description);
      const existingAttrs = typeof existing.attrs === "object" ? existing.attrs : {};

      const resp = await fetch(baseUrl + "/api/items/" + encodeURIComponent(existing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mergedDesc,
          tags: mergedTags,
          aliases: mergedAliases,
          attrs: Object.assign({}, existingAttrs, type === "rule"
            ? { ruleCategory: summary || existingAttrs.ruleCategory || "其他" }
            : { era: existingAttrs.era || "", isAutoExtracted: true }
          ),
        }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "更新设定失败");
      return { id: result.data?.id, type, name: title, target: "story-bible", _action: "merged" };
    }

    const resp = await fetch(baseUrl + "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: dbType,
        name: title,
        summary: summary,
        description: description,
        tags: tags,
        aliases: aliases,
        attrs: type === "rule"
          ? { ruleCategory: summary || "其他" }
          : { era: "", involvedCharacterIds: [], involvedFactionIds: [], isAutoExtracted: true },
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建设定失败");
    return { id: result.data?.id, type, name: title, target: "story-bible", _action: "created" };
  }

  // ── Note → POST /api/items (as reference) ──
  if (type === "note") {
    const existing = await _findExistingItem(projectId, "reference", title, baseUrl);

    if (existing) {
      const mergedTags = _mergeTags(existing.tags, tags);
      const mergedDesc = _mergeText(existing.description, description);

      const resp = await fetch(baseUrl + "/api/items/" + encodeURIComponent(existing.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: mergedDesc,
          tags: mergedTags,
        }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "更新备注失败");
      return { id: result.data?.id, type, name: title, target: "story-bible", _action: "merged" };
    }

    const resp = await fetch(baseUrl + "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId, type: "reference", name: title,
        summary: summary, description: description,
        tags: tags, aliases: aliases,
        attrs: {},
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建备注失败");
    return { id: result.data?.id, type, name: title, target: "story-bible", _action: "created" };
  }

  // ── Outline → POST /api/outline/volumes or chapters ──
  if (type === "outline") {
    const storyId = await _ensureOutlineStory(projectId, baseUrl);
    if (!storyId) throw new Error("无法创建或找到大纲故事，请先在大纲面板中创建故事");
    const parentName = item.parentName || "";
    // If it has a parentName, or the title looks like a chapter, treat as chapter
    const isChapter = parentName || /第[一二三四五六七八九十\d]+[章节卷]/.test(title) || /^第.+章/.test(title);

    if (isChapter) {
      let volumeId = null;
      if (parentName) {
        volumeId = await _findOrCreateOutlineVolume(storyId, parentName, baseUrl);
      } else {
        // Try to find any existing volume to attach this chapter to
        const listResp = await fetch(baseUrl + "/api/outline/volumes?storyId=" + encodeURIComponent(storyId));
        const listResult = await listResp.json();
        const volumes = listResult.success ? listResult.data : [];
        if (volumes.length > 0) volumeId = volumes[0].id;
      }

      const resp = await fetch(baseUrl + "/api/outline/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volumeId: volumeId,
          title: title,
          summary: description || summary,
          order: item.order || 0,
        }),
      });

      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "创建章节失败");
      return { id: result.data?.id, type: "chapter", name: title, target: "outline" };
    } else {
      // Create as volume
      const resp = await fetch(baseUrl + "/api/outline/volumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: storyId,
          title: title,
          description: description || summary,
        }),
      });

      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "创建卷失败");
      return { id: result.data?.id, type: "volume", name: title, target: "outline" };
    }
  }

  // ── Future Scene → POST /api/future-scenes ──
  if (type === "futureScene") {
    const resp = await fetch(baseUrl + "/api/future-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title: title,
        summary: description || summary,
        sceneType: item.payload?.tags?.[0] || "爽点",
        importance: item.confidence > 0.8 ? "high" : "medium",
        notes: description,
        tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
      }),
    });

    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建未来场景失败");
    return { id: result.data?.id, type, name: title, target: "future-scene" };
  }

  throw new Error("Unknown type: " + type);
}

// ── Outline helpers ──

async function _ensureOutlineStory(projectId, baseUrl) {
  // Check if any story exists
  const listResp = await fetch(baseUrl + "/api/outline/stories?projectId=" + encodeURIComponent(projectId));
  const listResult = await listResp.json();
  if (listResult.success && listResult.data && listResult.data.length > 0) {
    return listResult.data[0].id;  // Return first story's ID
  }

  // Create default story
  const createResp = await fetch(baseUrl + "/api/outline/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: projectId, title: "（导入自动创建）" }),
  });
  const createResult = await createResp.json();
  if (createResult.success) return createResult.data.id;
  return null;
}

async function _findOrCreateOutlineVolume(storyId, parentName, baseUrl) {
  // List volumes
  const listResp = await fetch(baseUrl + "/api/outline/volumes?storyId=" + encodeURIComponent(storyId));
  const listResult = await listResp.json();
  const volumes = listResult.success ? listResult.data : [];

  // Exact match
  let vol = volumes.find((v) => v.title === parentName.trim());
  if (vol) return vol.id;

  // Fuzzy match
  vol = volumes.find(
    (v) => v.title.includes(parentName.trim()) || parentName.trim().includes(v.title)
  );
  if (vol) return vol.id;

  // Create new
  const createResp = await fetch(baseUrl + "/api/outline/volumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storyId: storyId,
      title: parentName.trim(),
      description: "（从文档导入自动创建）",
    }),
  });
  const createResult = await createResp.json();
  if (!createResult.success) throw new Error("创建卷失败: " + createResult.error);
  return createResult.data.id;
}

module.exports = router;
