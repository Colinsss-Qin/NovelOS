/* ================================================================
   Import Assistant / Chunker
   Text chunking → AI call scheduling → merge/dedup → conflict detection
   ================================================================ */

const { getProvider } = require("../../skills/ai-skill");

// ── System prompt for messy manuscript analysis ──
const SYSTEM_PROMPT = `你是一位资深小说编辑。分析以下创作手稿片段，提取所有可识别的故事设定信息。

重要原则：
- 手稿可能格式混乱、语句破碎、包含作者的草稿笔记和未定想法
- 不要假设任何格式（不要求"人物：xxx"这样的标签）
- 从叙述中推断：角色、地点、势力、规则体系、世界观设定、大纲信息、未来场景规划
- 区分"已确定设定"和"作者还在犹豫的想法/脑洞"
- 对于不确定的信息，用 note 类型标记

提取类型和规则：
1. character（角色）：姓名/代号、身份、性格、外貌、背景。如果只提到名字没描述，也要提取，summary 写"待补充"
2. location（地点）：地名、类型（城市/宗门/秘境/大陆等）、特征。包括只提了名字的地点
3. faction（势力）：组织/宗门/国家/家族名称、类型、描述
4. rule（规则体系）：修炼体系、等级制度、魔法系统、世界规则。包括能力设定（如"风系能力"）
5. lore（世界观）：历史传说、文化风俗、种族设定、世界背景
6. outline（大纲）：章节名、章节概要、卷名。能推断裂的章节序号
7. futureScene（未来场景）：作者计划的爽点、名场面、伏笔、高潮情节
8. note（备注）：不确定但值得记录的信息、作者的创作思路、待定想法

每个建议必须包含：
- type: 上述 8 种之一
- title: 条目名称（简短，≤20字）
- summary: 一句话简介（≤30字）
- confidence: 0.0-1.0 的置信度（确定设定 0.8+，待定想法 0.5-0.7）
- sourceExcerpt: 原文引用（≤100字），必须是手稿中的原句，不要编造
- payload: 对象，含 detailedDescription（详细描述，人物须含性格/外貌/背景）和 tags（字符串数组）

输出格式：严格 JSON 数组，不要 markdown 代码块，不要额外说明文字。
[\n  {\n    "type": "character",\n    "title": "林照夜",\n    "summary": "主角，从白鹿城死人堆中爬出",\n    "confidence": 0.9,\n    "sourceExcerpt": "主角林照夜在一个叫白鹿城的地方醒来...从死人堆里爬出来",\n    "payload": {"detailedDescription": "风系能力者，曾被追杀，性格坚韧", "tags": ["主角"]}\n  }\n]`;

// ── Model config ──
const CONCURRENCY = 3;
const CHUNK_SIZE = 4000;
const OVERLAP = 200;
const MAX_RETRIES = 1;
const TIMEOUT_MS = 30000;
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
  const provider = getProvider("kimi");
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
        maxTokens: 4096,
        signal: controller.signal,
      });

      const raw = result.content || "";
      const suggestions = _parseJSON(raw);
      return { chunkIndex, suggestions, raw };
    } catch (err) {
      lastError = _isAbortError(err) ? new Error(TIMEOUT_MESSAGE) : err;
      if (attempt < MAX_RETRIES) {
        // Wait before retry: 1s, then 2s
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
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

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // Try to extract JSON array or object
  let jsonStr = text;

  // Find the outermost JSON structure
  const arrayStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  const start = arrayStart >= 0 ? arrayStart : objStart;
  if (start < 0) return [];

  // Find matching closing bracket
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "[" || text[i] === "{") depth++;
    if (text[i] === "]" || text[i] === "}") {
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
      return [];
    }
  }
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
function merge(suggestionsByChunk) {
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

    // Merge group
    if (group.length === 1) {
      const item = _normalizeItem(group[0]);
      item.id = "sug_" + merged.length;
      merged.push(item);
    } else {
      const item = _mergeGroup(group);
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
    },
    status: "pending",
  };
}

function _mergeGroup(group) {
  // Highest confidence
  const best = group.reduce((a, b) =>
    (b.confidence || 0) > (a.confidence || 0) ? b : a
  );

  // Combine source excerpts
  const excerpts = [...new Set(group.map((s) => s.sourceExcerpt).filter(Boolean))];
  const combinedExcerpt = excerpts.join("；").slice(0, 300);

  // Combine tags
  const tags = [...new Set(group.flatMap((s) => s.payload?.tags || []))];

  return {
    id: "",
    type: best.type,
    title: (best.title || "").trim(),
    summary: (best.summary || "").slice(0, 60),
    confidence: best.confidence || 0.7,
    sourceExcerpt: combinedExcerpt,
    targetModule: _typeToModule(best.type),
    targetCategory: tags[0] || "",
    payload: {
      detailedDescription: best.payload?.detailedDescription || best.summary || "",
      tags: tags,
      aliases: best.payload?.aliases || [],
    },
    status: "pending",
    _mergedFrom: group.length,
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
