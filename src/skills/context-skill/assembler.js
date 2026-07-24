/* ================================================================
   Context Assembler — 章节生成上下文装配引擎
   按优先级分层装配，决定 AI 生成时能"看到"哪些设定
   ================================================================ */

const { prisma } = require("../../lib/prisma");

// ═══════════════════════════════════
//  Helpers
// ═══════════════════════════════════

/** 安全解析 JSON 字符串数组，失败返回空数组 */
function parseIdArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** 从章节的所有 Scene 中收集去重的关联 ID */
function collectSceneAssociations(scenes) {
  const characterIds = new Set();
  const locationIds = new Set();
  const factionIds = new Set();

  for (const sc of scenes) {
    for (const id of parseIdArray(sc.characterIds)) characterIds.add(id);
    for (const id of parseIdArray(sc.locationIds)) locationIds.add(id);
    for (const id of parseIdArray(sc.factionIds)) factionIds.add(id);
  }

  return {
    characterIds: [...characterIds],
    locationIds: [...locationIds],
    factionIds: [...factionIds],
  };
}

/** 查找上一章：同卷内 order-1，若是卷首则取上一卷末章 */
async function findPreviousChapter(currentChapter) {
  // 同卷内找 order - 1
  const prevInVolume = await prisma.chapter.findFirst({
    where: {
      volumeId: currentChapter.volumeId,
      projectId: currentChapter.projectId,
      order: currentChapter.order - 1,
    },
  });

  if (prevInVolume) return prevInVolume;

  // 当前是卷首，找上一卷
  if (currentChapter.volumeId) {
    const currentVolume = await prisma.volume.findUnique({
      where: { id: currentChapter.volumeId },
    });

    if (currentVolume) {
      const prevVolume = await prisma.volume.findFirst({
        where: {
          projectId: currentChapter.projectId,
          order: currentVolume.order - 1,
        },
      });

      if (prevVolume) {
        const lastChapter = await prisma.chapter.findFirst({
          where: { volumeId: prevVolume.id },
          orderBy: { order: "desc" },
        });
        if (lastChapter) return lastChapter;
      }
    }
  }

  return null;
}

/** 从 summary 中提取有意义的词作为关键词（中文按字符切分，取长度 >= 2 的词） */
function extractKeywords(text) {
  if (!text) return [];
  // 简单策略：按常见标点切分，取长度 >= 2 的片段作为关键词
  const segments = text.split(/[，。、；：！？\s,.;:!?]+/).filter(Boolean);
  const keywords = new Set();
  for (const seg of segments) {
    if (seg.length >= 2 && seg.length <= 10) {
      keywords.add(seg);
    }
  }
  return [...keywords];
}

/** 规则条目排序：名称包含 summary 关键词的优先，其余保持原序 */
function rankRules(rules, keywords) {
  if (!keywords.length) return rules;
  const keywordSet = new Set(keywords);

  const scored = rules.map((rule) => {
    let score = 0;
    for (const kw of keywordSet) {
      if (rule.title?.includes(kw)) score += 1;
      if (rule.category?.includes(kw)) score += 0.5;
    }
    return { rule, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.rule);
}

// ═══════════════════════════════════
//  Core
// ═══════════════════════════════════

/**
 * 构建章节生成的完整上下文
 * @param {string} chapterId - 目标章节 ID
 * @param {string} projectId - 所属项目 ID
 * @returns {Promise<{contextBlock: string, usedItems: object}>}
 */
async function buildChapterContext(chapterId, projectId) {
  const usedItems = {
    characters: [],
    locations: [],
    factions: [],
    rules: [],
    prevChapter: null,
    futureScenes: [],
  };

  // ── 第一层：当前章节 + 卷 ──────────────────────────────
  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, projectId },
  });
  if (!chapter) {
    throw new Error(`章节不存在: ${chapterId}`);
  }

  let volumeTitle = "（无卷）";
  let volumeSummary = "";
  if (chapter.volumeId) {
    const volume = await prisma.volume.findFirst({
      where: { id: chapter.volumeId, projectId },
    });
    if (volume) {
      volumeTitle = volume.title;
      volumeSummary = volume.summary || "";
    }
  }

  // ── 第二层：从 Scene 聚合关联的人物/地点/势力 ──────────
  const scenes = await prisma.scene.findMany({
    where: { chapterId: chapter.id, projectId },
    orderBy: { order: "asc" },
  });
  const { characterIds, locationIds, factionIds } =
    collectSceneAssociations(scenes);

  const [characters, locations, factions] = await Promise.all([
    characterIds.length
      ? prisma.character.findMany({ where: { id: { in: characterIds }, projectId } })
      : [],
    locationIds.length
      ? prisma.location.findMany({ where: { id: { in: locationIds }, projectId } })
      : [],
    factionIds.length
      ? prisma.faction.findMany({ where: { id: { in: factionIds }, projectId } })
      : [],
  ]);

  // ── 第三层：规则体系（全量，智能截断）─────────────────
  const allRules = await prisma.ruleSystem.findMany({
    where: { projectId },
  });

  const keywords = extractKeywords(chapter.summary);
  const rankedRules = rankRules(allRules, keywords);

  // ── 第四层：上一章摘要 ────────────────────────────────
  const prevChapter = await findPreviousChapter(chapter);

  // ── 第五层：本章关联的未来场景 ─────────────────────────
  const futureScenes = await prisma.futureScene.findMany({
    where: { expectedChapterId: chapter.id, projectId },
  });

  // ═══════════════════════════════════
  //  构建 contextBlock
  // ═══════════════════════════════════

  const lines = [];

  // ── 当前章节 ──
  lines.push("=== 当前章节 ===");
  lines.push(`【卷】${volumeTitle}`);
  if (volumeSummary) {
    lines.push(`【卷摘要】${volumeSummary}`);
  }
  lines.push(`【章节】${chapter.title}`);
  lines.push(`【本章要发生的事】${chapter.summary || "（未填写）"}`);
  lines.push("");

  // ── 涉及人物 ──
  if (characters.length > 0) {
    lines.push("=== 涉及人物 ===");
    for (const ch of characters) {
      const parts = [];
      if (ch.occupation) parts.push(ch.occupation);
      const identity = parts.length ? parts.join(" / ") : "未知身份";
      lines.push(
        `${ch.name}（${identity}）：${ch.personality || "性格未设定"}。当前状态：${ch.status || "active"}`
      );
      usedItems.characters.push(ch.name);
    }
    lines.push("");
  }

  // ── 相关地点 ──
  if (locations.length > 0) {
    lines.push("=== 相关地点 ===");
    for (const loc of locations) {
      lines.push(`${loc.name}：${loc.description || "（无描述）"}`);
      usedItems.locations.push(loc.name);
    }
    lines.push("");
  }

  // ── 势力 ──
  if (factions.length > 0) {
    lines.push("=== 涉及势力 ===");
    for (const fac of factions) {
      lines.push(
        `${fac.name}（${fac.type || "未知类型"}）：${fac.description || "（无描述）"}`
      );
      usedItems.factions.push(fac.name);
    }
    lines.push("");
  }

  // ── 世界规则 ──
  if (rankedRules.length > 0) {
    lines.push("=== 世界规则（严格遵守，不得自行发明）===");
    let ruleCharCount = 0;
    const RULE_MAX = 1500;

    for (const rule of rankedRules) {
      if (ruleCharCount >= RULE_MAX) break;
      const snippet = (rule.content || "").slice(0, 200);
      const entry = `${rule.title}：${snippet}`;
      lines.push(entry);
      ruleCharCount += entry.length;
      usedItems.rules.push(rule.title);
    }
    lines.push("");
  }

  // ── 前情摘要 ──
  if (prevChapter) {
    lines.push("=== 前情摘要 ===");
    // autoSummary 不在当前 schema 中，先尝试读取，fallback 到 summary
    const prevSummary = prevChapter.autoSummary || prevChapter.summary || "（无摘要）";
    lines.push(prevSummary);
    usedItems.prevChapter = prevChapter.autoSummary
      ? `第${prevChapter.order + 1}章 autoSummary 已加载`
      : `第${prevChapter.order + 1}章 summary 已加载`;
    lines.push("");
  }

  // ── 伏笔 ──
  if (futureScenes.length > 0) {
    lines.push("=== 本章可布局的伏笔 ===");
    for (const fs of futureScenes) {
      const trigger = fs.triggerConditions || "（未设定触发条件）";
      lines.push(`${fs.title}：触发条件 ${trigger}`);
      usedItems.futureScenes.push(fs.title);
    }
    lines.push("");
  }

  const contextBlock = lines.join("\n");

  return { contextBlock, usedItems };
}

module.exports = { buildChapterContext };
