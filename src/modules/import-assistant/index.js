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
    const { projectId, content, fileName } = req.body;

    if (!projectId)
      return res.status(400).json({ success: false, error: "projectId is required" });
    if (!content || !content.trim())
      return res.status(400).json({ success: false, error: "content is required" });

    _requireApiKey();

    // 1. Chunk
    const chunks = chunk(content, 4000);

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
    const suggestions = merge(chunkResults);
    const counts = countByType(suggestions);

    res.json({
      success: true,
      data: {
        sourceFile: fileName || "未命名文档",
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
    const resp = await fetch(baseUrl + "/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: title,
        alias: aliases.length > 0 ? aliases[0] : "",
        personality: description.slice(0, 200),
        background: description,
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "创建角色失败");
    return { id: result.data?.id, type, name: title, target: "character-manager" };
  }

  // ── Location → POST /api/items (Story Bible reads this) ──
  if (type === "location") {
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
    return { id: result.data?.id, type, name: title, target: "story-bible", attrs: result.data?.attrs || {} };
  }

  // ── Faction → POST /api/items ──
  if (type === "faction") {
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
    return { id: result.data?.id, type, name: title, target: "story-bible", attrs: result.data?.attrs || {} };
  }

  // ── Rule / Lore → POST /api/items ──
  if (type === "rule" || type === "lore") {
    const resp = await fetch(baseUrl + "/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: type === "lore" ? "history_event" : "rule",
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
    return { id: result.data?.id, type, name: title, target: "story-bible", attrs: result.data?.attrs || {} };
  }

  // ── Note → POST /api/items (as reference) ──
  if (type === "note") {
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
    return { id: result.data?.id, type, name: title, target: "story-bible", attrs: {} };
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
