/* ================================================================
   AI Skill / Server-side Entry (Node.js / CommonJS)
   Provider factory + /api/generate SSE stream handler.
   Falls back to demo generator when no API key is configured.
   ================================================================ */

const { DeepSeekProvider } = require("./providers/deepseek");
const { ClaudeProvider } = require("./providers/claude");
const { KimiProvider } = require("./providers/kimi");
const { demoGenerate } = require("./demo-generator");

// Provider cache
let _cachedProvider = null;
let _cachedName = null;

// ── System prompts for common tasks ──
const TASK_SYSTEM_PROMPTS = {
  chapter_generate:
    "你是一位网络小说作家。根据用户提供的大纲/种子，生成一章完整的章节内容。文笔流畅，有画面感。字数：2000-4000字。",
  chapter_continue:
    "你是一位网络小说作家。根据前文内容，续写下一段情节。保持风格一致，自然衔接。",
  chapter_rewrite:
    "你是一位网络小说编辑。根据用户提供的原文和改进要求，重写该段落。保持核心情节不变，优化表达和节奏。",
  chapter_polish:
    "你是一位文字编辑。在不改变原意的前提下，润色以下内容，提升文笔质量。修正语病，增强画面感。",
  character_generate:
    "你是一位角色设计师。根据用户提供的故事背景和要求，创建一个详细的小说角色设定。包含：姓名、性格、外貌、背景故事、能力特点。",
  dialogue_generate:
    "你是一位对话设计师。根据角色设定和场景，生成一段自然生动的人物对话。要能体现人物性格和推进剧情。",
  setting_expand:
    "你是一位世界观设计师。根据用户提供的基础设定，展开详细的世界观描述。包含：地理位置、历史背景、势力关系、隐藏秘密。",
  outline_generate:
    "你是一位故事策划。根据用户提供的故事方向，生成一份章节大纲。包含：主线脉络、关键节点、冲突布局、伏笔埋设。",
  foreshadow_extend:
    "你是一位悬疑小说作家。根据已有伏笔，扩展其在不同章节中的埋设和回收方案。要自然不刻意。",
};

function getProvider(name) {
  const providerName = name || process.env.DEFAULT_AI_PROVIDER || "deepseek";

  if (_cachedProvider && _cachedName === providerName) {
    return _cachedProvider;
  }

  switch (providerName) {
    case "deepseek": _cachedProvider = new DeepSeekProvider(); break;
    case "claude":   _cachedProvider = new ClaudeProvider();   break;
    case "kimi":     _cachedProvider = new KimiProvider();     break;
    default:         _cachedProvider = new DeepSeekProvider();  break;
  }

  _cachedName = providerName;
  return _cachedProvider;
}

/**
 * Check if any AI provider has a configured API key.
 */
function hasApiKey() {
  return !!(process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.KIMI_API_KEY);
}

/**
 * Express route handler for POST /api/generate
 * Streams SSE response. Falls back to demo generator when no API key.
 *
 * Body: {
 *   task?: string,          // task name → auto systemPrompt
 *   userPrompt: string,     // required
 *   systemPrompt?: string,  // overrides task prompt
 *   temperature?: number,
 *   maxTokens?: number,
 *   provider?: string
 * }
 */
async function handleGenerateRoute(req, res) {
  try {
    const { task, systemPrompt, userPrompt, temperature, maxTokens, provider: providerName } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ success: false, error: "userPrompt is required" });
    }

    // Resolve system prompt from task if provided
    const resolvedSystemPrompt = systemPrompt || (task ? TASK_SYSTEM_PROMPTS[task] : undefined) || "";

    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // ── Demo mode (no API key) ──
    if (!hasApiKey()) {
      res.write(
        `data: ${JSON.stringify({ status: "demo", message: "未配置 API Key，使用演示模式生成" })}\n\n`
      );

      const taskName = task || "chapter_generate";
      const generator = demoGenerate(taskName, { fast: false });

      for await (const token of generator) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true, demo: true })}\n\n`);
      res.end();
      return;
    }

    // ── Real AI mode ──
    const provider = getProvider(providerName);

    const generator = provider.generateStream({
      systemPrompt: resolvedSystemPrompt,
      userPrompt,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 4096,
    });

    for await (const token of generator) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}

module.exports = { getProvider, handleGenerateRoute, hasApiKey, TASK_SYSTEM_PROMPTS };
