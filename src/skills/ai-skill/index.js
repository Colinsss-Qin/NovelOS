/* AI Skill / server-side generation route. */

const { DeepSeekProvider } = require("./providers/deepseek");
const { ClaudeProvider } = require("./providers/claude");
const { KimiProvider } = require("./providers/kimi");

let cachedProvider = null;
let cachedName = null;

const TASK_SYSTEM_PROMPTS = {
  chapter_generate:
    "你是一位小说作者。根据用户提供的信息生成一章完整正文。文笔流畅，有画面感。只输出小说正文，不要输出解释说明。",
  chapter_continue:
    "你是一位小说作者。根据前文自然续写，保持风格、人物和世界观一致。只输出小说正文。",
  chapter_rewrite:
    "你是一位小说编辑。在不改变核心情节的前提下重写正文，优化表达和节奏。",
  chapter_polish:
    "你是一位文字编辑。润色正文，修正语病，增强画面感，不改变原意。",
  dialogue_generate:
    "你擅长人物对话。根据场景生成自然、生动、能体现人物性格的对话。",
};

function hasApiKey() {
  return !!(process.env.DEEPSEEK_API_KEY || process.env.KIMI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

function defaultProviderName() {
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.KIMI_API_KEY) return "kimi";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return "deepseek";
}

function getProvider(name) {
  const providerName = name || process.env.DEFAULT_AI_PROVIDER || defaultProviderName();
  if (cachedProvider && cachedName === providerName) return cachedProvider;

  switch (providerName) {
    case "kimi":
      cachedProvider = new KimiProvider();
      break;
    case "claude":
      cachedProvider = new ClaudeProvider();
      break;
    case "deepseek":
    default:
      cachedProvider = new DeepSeekProvider();
      break;
  }
  cachedName = providerName;
  return cachedProvider;
}

function missingKeyMessage() {
  return "未配置 API Key。请在 .env 中设置 KIMI_API_KEY 或 DEEPSEEK_API_KEY。";
}

async function handleGenerateRoute(req, res) {
  try {
    const { task, systemPrompt, userPrompt, temperature, maxTokens, provider: providerName } = req.body || {};
    if (!userPrompt) {
      return res.status(400).json({ success: false, error: "userPrompt is required" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    if (!hasApiKey()) {
      res.write(`data: ${JSON.stringify({
        error: missingKeyMessage(),
        missingEnv: ["KIMI_API_KEY", "DEEPSEEK_API_KEY"],
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const provider = getProvider(providerName);
    if (!provider.apiKey) {
      res.write(`data: ${JSON.stringify({ error: `${provider.name} 未配置 API Key` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const resolvedSystemPrompt = systemPrompt || (task ? TASK_SYSTEM_PROMPTS[task] : "") || "";
    let tokenCount = 0;

    try {
      const stream = provider.generateStream({
        systemPrompt: resolvedSystemPrompt,
        userPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4096,
      });

      for await (const token of stream) {
        tokenCount += 1;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      if (tokenCount === 0) {
        res.write(`data: ${JSON.stringify({ error: "AI 返回了空内容，请检查 API Key、模型或余额。" })}\n\n`);
      }
    } catch (err) {
      console.error(`[generate] ${provider.name} error:`, err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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
