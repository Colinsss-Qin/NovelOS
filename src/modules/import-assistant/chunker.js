/* ================================================================
   Import Assistant / Chunker
   Text chunking → AI call scheduling → merge/dedup → conflict detection
   ================================================================ */

const { getProviderForTask } = require("../../skills/ai-skill");

// ── System prompt for messy manuscript analysis ──
const SYSTEM_PROMPT = `你是资深小说编辑。从创作手稿中提取所有可识别的故事设定。手稿可能格式混乱、包含草稿笔记——从叙述中推断，不假设格式。

提取类型：
1. character — 每个有名字的角色都要提取（哪怕只出现一次）。payload:
   · detailedDescription: 姓名/身份/性格/说话方式/行事逻辑/处境/外貌/关系（文中有则填，无则空）
   · speakingStyle / behaviorLogic / forbidden（此人绝对不能出现的行为）
   · tags: 必含角色定位（主角/配角/反派/龙套）
2. location — 地名、类型、特征，含只提了名字的地点
3. faction — 组织/宗门/国家/家族，列出已知成员
4. rule — 修炼体系、等级制度、魔法系统、世界规则、能力设定
5. lore — 历史传说、文化风俗、种族设定、世界背景
6. outline — 章节名、概要、卷名、序号
7. futureScene — 爽点、名场面、伏笔、高潮情节
8. note — 不确定但值得记录的信息/创作思路

每个条目: type, title(≤20字), summary(≤30字), confidence(0-1), sourceExcerpt(原文≤100字), payload
detailedDescription 每个维度≤两句话，无信息则空，不编造。同人物跨文档整合为一份。

输出严格 JSON 数组，无 markdown 块，无额外文字。`;

// ── Model config ──
const CONCURRENCY = 3;
const CHUNK_SIZE = 2500;
const OVERLAP = 200;
const MAX_RETRIES = 2;
const TIMEOUT_MS = 120000;
const TIMEOUT_MESSAGE = "AI 分析超时，请缩短文本或稍后重试";

// ── Chunk text by paragraph boundaries ──
function chunk(text, maxSize) {
  maxSize = maxSize || CHUNK_SIZE;
  if (!text || text.length <= maxSize) return [text || ""];

  // Split by paragraphs
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxSize && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: keep last part of previous chunk
      const overlapText = current.length > OVERLAP ? current.slice(-OVERLAP) : current;
      current = overlapText + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// ── Call AI for a single chunk with retry ──
async function analyzeChunk(chunkText, chunkIndex) {
  const provider = getProviderForTask("document_analyze");
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const result = await provider.generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt:
          "【手稿片段 " + (chunkIndex + 1) + "】\n\n" + chunkText,
        temperature: 0.2,
        maxTokens: 8192,
        signal: controller.signal,
      });

      const raw = result.content || "";
      const suggestions = _parseJSON(raw);
      return { chunkIndex, suggestions, raw };
    } catch (err) {
      lastError = _isAbortError(err) ? new Error(TIMEOUT_MESSAGE) : err;
      if (attempt < MAX_RETRIES) {
        // Wait before retry: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  return { chunkIndex, suggestions: [], raw: "", error: lastError?.message || "Unknown error" };
}

function _isAbortError(err) {
  return err?.name === "AbortError" || err?.code === "ABORT_ERR";
}

// ── Parallel AI calls with concurrency limit ──
async function analyzeChunks(chunks) {
  const results = [];
  const queue = chunks.map((text, i) => ({ text, index: i }));

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const result = await analyzeChunk(item.text, item.index);
      results.push(result);
    }
  }

  // Start CONCURRENCY workers
  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, chunks.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  // Sort by chunk index
  results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return results;
}

// ── Robust JSON parsing ──
function _parseJSON(raw) {
  if (!raw) return [];

  let text = raw.trim();

  // Strip markdown code fences — handle leading/trailing fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");

  // Also strip markdown fences that may be on their own lines
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "");

  // Try to extract JSON array or object
  let jsonStr = text;

  // Find the outermost JSON structure
  const arrayStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  const start = arrayStart >= 0 ? arrayStart : objStart;
  if (start < 0) return [];

  // Find matching closing bracket (ignore brackets inside strings)
  let depth = 0, end = -1;
  let inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end > 0) jsonStr = text.slice(start, end);

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) return parsed.suggestions;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  } catch (e) {
    // Try cleaning: remove trailing commas
    const cleaned = jsonStr.replace(/,\s*([}\]])/g, "$1");
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) return parsed.suggestions;
      return [];
    } catch (e2) {
      // Last resort: try to salvage partial array (truncated JSON)
      return _salvagePartial(jsonStr);
    }
  }
}

// ── Salvage partial JSON array (handle truncated output) ──
function _salvagePartial(jsonStr) {
  if (!jsonStr || jsonStr[0] !== "[") return [];
  // Remove the last incomplete object and try to close the array
  let lastComma = jsonStr.lastIndexOf(",{");
  if (lastComma < 0) lastComma = jsonStr.lastIndexOf(",\n{");
  if (lastComma < 0) lastComma = jsonStr.lastIndexOf(",\r\n{");
  if (lastComma < 0) return [];
  const salvaged = jsonStr.slice(0, lastComma) + "]";
  try {
    const parsed = JSON.parse(salvaged);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { /* give up */ }
  return [];
}

// ── Normalize a title for comparison ──
function _normalize(s) {
  return (s || "").trim().replace(/\s+/g, "");
}

// ── Check if two strings are similar (fuzzy) ──
function _isFuzzyMatch(a, b) {
  const na = _normalize(a), nb = _normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

// ── Merge suggestions across chunks ──
function merge(suggestionsByChunk, fileCount) {
  const all = [];
  const typeOrder = ["character","location","faction","rule","lore","outline","futureScene","note"];

  // Flatten with source chunk tracking
  for (const result of suggestionsByChunk) {
    for (const sug of result.suggestions || []) {
      if (!sug.type || !sug.title) continue;
      if (!typeOrder.includes(sug.type)) continue;
      all.push({ ...sug, _chunkIndex: result.chunkIndex });
    }
  }

  const merged = [];
  const used = new Set();

  for (let i = 0; i < all.length; i++) {
    if (used.has(i)) continue;
    const a = all[i];
    const group = [a];
    used.add(i);

    // Find all matching items
    for (let j = i + 1; j < all.length; j++) {
      if (used.has(j)) continue;
      const b = all[j];

      if (a.type !== b.type) continue; // Different type → don't merge

      // Exact title match
      const titleMatch = _isFuzzyMatch(a.title, b.title);

      // Alias cross-match
      let aliasMatch = false;
      const aAliases = a.payload?.aliases || a.payload?.tags || [];
      const bAliases = b.payload?.aliases || b.payload?.tags || [];
      if (aAliases.length && bAliases.length) {
        aliasMatch = aAliases.some((aa) => bAliases.some((bb) => _normalize(aa) === _normalize(bb)));
      }

      if (titleMatch || aliasMatch) {
        group.push(b);
        used.add(j);
      }
    }

    // Merge group — 后出现的补充前面没有的字段，不覆盖已有内容
    if (group.length === 1) {
      const item = _normalizeItem(group[0]);
      item.id = "sug_" + merged.length;
      item._mergedFrom = 1;
      merged.push(item);
    } else {
      const item = _mergeGroupMultiDoc(group, fileCount || group.length);
      item.id = "sug_" + merged.length;
      merged.push(item);
    }
  }

  // Detect conflicts
  const conflicts = _detectConflicts(merged);
  return conflicts;
}

function _normalizeItem(sug) {
  return {
    id: sug.id || "",
    type: sug.type,
    title: (sug.title || "").trim(),
    summary: (sug.summary || "").slice(0, 60),
    confidence: typeof sug.confidence === "number" ? sug.confidence : 0.7,
    sourceExcerpt: (sug.sourceExcerpt || "").slice(0, 200),
    targetModule: _typeToModule(sug.type),
    targetCategory: sug.payload?.tags?.[0] || "",
    payload: {
      detailedDescription: sug.payload?.detailedDescription || sug.summary || "",
      tags: sug.payload?.tags || [],
      aliases: sug.payload?.aliases || [],
      speakingStyle: sug.payload?.speakingStyle || "",
      behaviorLogic: sug.payload?.behaviorLogic || "",
      forbidden: sug.payload?.forbidden || "",
    },
    status: "pending",
  };
}

function _mergeGroup(group) {
  // delegate to multi-doc merge
  return _mergeGroupMultiDoc(group, group.length);
}

/**
 * 多文档合并：后出现的补充前面没有的字段，不覆盖已有内容。
 * 合并策略：取各组 combined 结果再拼接。
 */
function _mergeGroupMultiDoc(group, fileCount) {
  // Sort by chunk index to preserve document order
  group.sort((a, b) => (a._chunkIndex || 0) - (b._chunkIndex || 0));

  // Highest confidence for title/summary
  const best = group.reduce((a, b) =>
    (b.confidence || 0) > (a.confidence || 0) ? b : a
  );

  // Combine source excerpts (deduped)
  const excerpts = [...new Set(group.map((s) => s.sourceExcerpt).filter(Boolean))];
  const combinedExcerpt = excerpts.join("；").slice(0, 300);

  // Combine tags (deduped)
  const tags = [...new Set(group.flatMap((s) => s.payload?.tags || []))];

  // 多文档合并核心：后出现的补充前面空白的字段
  function _mergeField(key) {
    for (let i = 0; i < group.length; i++) {
      const val = (group[i].payload || {})[key] || "";
      if (val.trim()) return val.trim();
    }
    return "";
  }
  // detailedDescription 特殊处理：拼接所有非空值
  var descParts = group
    .map(function (s) { return (s.payload || {}).detailedDescription || ""; })
    .filter(function (d) { return d.trim(); });
  var mergedDesc = descParts.length > 0 ? descParts.join("\n\n---\n") : (best.payload?.detailedDescription || best.summary || "");

  // aliases: collect all unique
  var allAliases = [];
  group.forEach(function (s) {
    var a = (s.payload || {}).aliases || [];
    if (Array.isArray(a)) allAliases = allAliases.concat(a);
  });
  var uniqueAliases = [...new Set(allAliases.map(function (a) { return a.trim(); }).filter(Boolean))];

  return {
    id: "",
    type: best.type,
    title: (best.title || "").trim(),
    summary: (best.summary || "").slice(0, 60),
    confidence: Math.min(1, (best.confidence || 0.7) + group.length * 0.05), // 多文档交叉验证提升置信度
    sourceExcerpt: combinedExcerpt,
    targetModule: _typeToModule(best.type),
    targetCategory: tags[0] || "",
    payload: {
      detailedDescription: mergedDesc,
      tags: tags,
      aliases: uniqueAliases,
      speakingStyle: _mergeField("speakingStyle"),
      behaviorLogic: _mergeField("behaviorLogic"),
      forbidden: _mergeField("forbidden"),
    },
    status: "pending",
    _mergedFrom: fileCount || group.length,
  };
}

// ── Detect conflicts in merged suggestions ──
function _detectConflicts(suggestions) {
  // Check for type conflicts (same title, different type)
  for (let i = 0; i < suggestions.length; i++) {
    for (let j = i + 1; j < suggestions.length; j++) {
      const a = suggestions[i], b = suggestions[j];
      if (a.type === b.type) continue;
      if (_isFuzzyMatch(a.title, b.title)) {
        a.status = "conflict";
        b.status = "conflict";
        a._conflictWith = a._conflictWith || [];
        a._conflictWith.push(b.id || ("sug_" + j));
        b._conflictWith = b._conflictWith || [];
        b._conflictWith.push(a.id || ("sug_" + i));
      }
    }
  }

  return suggestions;
}

function _typeToModule(type) {
  switch (type) {
    case "outline": return "outline";
    case "futureScene": return "future-scene";
    default: return "story-bible";
  }
}

// ── Count suggestions by type ──
function countByType(suggestions) {
  const counts = {};
  const types = ["character","location","faction","rule","lore","outline","futureScene","note"];
  for (const t of types) counts[t] = 0;
  for (const s of suggestions) {
    if (counts[s.type] !== undefined) counts[s.type]++;
  }
  return counts;
}

module.exports = {
  chunk,
  analyzeChunks,
  merge,
  countByType,
  CHUNK_SIZE,
  CONCURRENCY,
  SYSTEM_PROMPT,
};
