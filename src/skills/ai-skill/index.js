/* AI Skill / server-side generation route. */

const { DeepSeekProvider } = require("./providers/deepseek");
const { ClaudeProvider } = require("./providers/claude");
const { KimiProvider } = require("./providers/kimi");
const { buildChapterContext } = require("../context-skill/assembler");

let cachedProvider = null;
let cachedName = null;

// ═══════════════════════════════════
//  双模型分工策略
// ═══════════════════════════════════
const MODEL_CONFIG = {
  document_analyze: {
    provider: "kimi",
    model: "moonshot-v1-128k",
    reason: "128k 窗口适合一次处理大量文档内容",
  },
  chapter_generate: {
    provider: "deepseek",
    model: "deepseek-chat",
    reason: "遵循复杂 system prompt 的能力更强",
  },
  auto_summary: {
    provider: "deepseek",
    model: "deepseek-chat",
    reason: "需要精准提炼信息，指令遵循更重要",
  },
  plot_designer: {
    provider: "kimi",
    // model 不指定，使用 provider 默认值（来自 .env KIMI_MODEL）
    reason: "Kimi 适合创意写作和剧情结构设计",
  },
};

function getProvider(name, opts) {
  const providerName = name || process.env.DEFAULT_AI_PROVIDER || defaultProviderName();
  const modelOverride = (opts && opts.model) || null;
  const cacheKey = providerName + (modelOverride ? ":" + modelOverride : "");
  if (cachedProvider && cachedName === cacheKey) return cachedProvider;

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
  if (modelOverride) {
    cachedProvider.model = modelOverride;
  }
  cachedName = cacheKey;
  return cachedProvider;
}

/**
 * 根据任务类型自动选择 provider + model
 * @param {string} taskType — MODEL_CONFIG 的 key
 * @returns {{ provider: object, model: string }}
 */
function getProviderForTask(taskType) {
  const cfg = MODEL_CONFIG[taskType];
  if (!cfg) return getProvider();
  return getProvider(cfg.provider, { model: cfg.model });
}

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
  plot_designer: null, // 由 handlePlotDesignerRoute 动态构建
};

function hasApiKey() {
  return !!(process.env.DEEPSEEK_API_KEY || process.env.KIMI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

function getProviderInfo(provider) {
  const selected = provider || getProvider();
  return { provider: selected.name, model: selected.model };
}

function defaultProviderName() {
  // 默认 DeepSeek-v3。若未配置 key 则在后端返回明确错误，
  // 不再自动回退到其他厂商。
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.DEFAULT_AI_PROVIDER === "kimi" && process.env.KIMI_API_KEY) return "kimi";
  if (process.env.DEFAULT_AI_PROVIDER === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  return "deepseek";
}

function missingKeyMessage() {
  return "未配置 API Key。请在 .env 中设置 KIMI_API_KEY 或 DEEPSEEK_API_KEY。";
}

/**
 * 根据项目类型 + contextBlock 构建 system prompt
 */
function buildSystemPrompt(projectGenre, contextBlock) {
  const genre = projectGenre || "宫廷政治";
  return `你是一位擅长宫廷政治斗争题材的资深网文作家，
熟读《琅琊榜》《大明王朝》《鹤唳华亭》等作品的叙事技法。

你的写作有以下特点：
- 每场对话都有表层信息和隐藏意图，人物不直接说出真实目的
- 权力博弈通过细节体现：一个眼神、一句模糊的话、一个看似无意的举动
- 节奏有张有弛：紧张的交锋之后有呼吸感，然后再推向下一个高潮
- 人物的每个行动都有明确的目的，没有多余的废话场景
- 伏笔自然埋设，读者看到后续才恍然大悟

每场政治博弈场景，动笔前须在脑中回答以下五问：
① 各方目标：这场戏里，A 想要什么，B 想要什么
② 各方筹码：A 手上有什么牌，B 手上有什么牌
③ 信息不对称：A 知道但 B 不知道的是什么，反之亦然
④ 本场结果：这场博弈结束后，谁赢了，赢了什么，输了什么
⑤ 留下的隐患：这个结果为后续埋下了什么危机

写作约束（严格遵守）：
1. 字数：每章正文不少于 2500 字，目标 3000 字
2. 结构：每章必须有起伏，不能从头到尾一个平调
3. 对话：至少包含一段有信息量的对话，台词背后有潜台词
4. 收尾：章节结尾必须有一个钩子，让读者想看下一章
5. 禁止：不写废话过渡段、不写无意义的环境描写堆砌、
         不让人物直接说出内心独白

${contextBlock}`;
}

/**
 * 根据章节标题和摘要构建 user prompt
 */
function buildUserPrompt(chapterTitle, summary) {
  const title = chapterTitle || "当前章节";
  const conflict = summary || "（待定）";
  return `请根据以上设定，生成【${title}】的完整正文。

本章的核心冲突是：${conflict}

写作要求：
- 从一个有画面感的场景切入，不要从"某某走进了某某地方"开始
- 确保本章结束时，至少有一件事和开始时不一样（权力格局、人物关系、或信息状态）
- 字数不少于 2500 字`;
}

/**
 * plot_designer 专用路由：非流式调用 AI，返回结构化 JSON
 */
async function handlePlotDesignerRoute(req, res) {
  try {
    const {
      protagonistName, protagonistGoal,
      opponentName, opponentGoal,
      informationGap, expectedOutcome,
    } = req.body || {};

    if (!protagonistName || !opponentName) {
      return res.status(400).json({ success: false, error: "主角和对手名称不能为空" });
    }

    if (!hasApiKey()) {
      return res.status(400).json({ success: false, error: missingKeyMessage() });
    }

    // 优先 Kimi，fallback 到默认 provider
    let provider = getProviderForTask("plot_designer");
    if (!provider.apiKey) {
      provider = getProvider();
    }
    if (!provider.apiKey) {
      return res.status(400).json({ success: false, error: `${provider.name} 未配置 API Key` });
    }

    // systemPrompt 由 _buildPlotDesignerPrompt 动态构建
    // ── 计算输入充实度 ──
    const goalLen = (protagonistGoal || "").length + (opponentGoal || "").length;
    const gapLen = (informationGap || "").length;
    const expectedLen = (expectedOutcome || "").length;
    const totalExtra = goalLen + gapLen + expectedLen;
    const filledCount = [protagonistGoal, opponentGoal, informationGap, expectedOutcome]
      .filter(function (v) { return v && v.trim().length > 0; }).length;

    let richness = 0;
    if (filledCount >= 3 && totalExtra >= 150) richness = 2;
    else if (filledCount >= 2 && totalExtra >= 50) richness = 1;

    console.log("[plot_designer] 充实度: level=" + richness + " filled=" + filledCount + " extraLen=" + totalExtra);

    const systemPrompt = _buildPlotDesignerPrompt(richness);
    const userPrompt = _buildPlotDesignerUserPrompt({
      protagonistName, protagonistGoal,
      opponentName, opponentGoal,
      informationGap, expectedOutcome,
      richness,
    });

    console.log("[plot_designer] provider:", provider.name, "model:", provider.model);
    console.log("[plot_designer] userPrompt 长度:", userPrompt.length);

    const result = await provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: richness >= 2 ? 8192 : richness >= 1 ? 6144 : 4096,
    });

    console.log("[plot_designer] AI 返回长度:", result.content?.length || 0,
                "tokens:", result.tokenUsed);

    const skeleton = parseAndValidateSkeleton(result.content, richness);

    res.json({ success: true, data: { skeleton, richness } });
  } catch (err) {
    console.error("[plot_designer] error:", err.message);
    const status = err.message && err.message.includes("缺少") ? 422 : 500;
    res.status(status).json({ success: false, error: err.message || "AI 生成失败" });
  }
}

/**
 * 清洗 AI 返回内容并解析为结构化骨架 JSON
 */
function parseAndValidateSkeleton(rawContent, richness) {
  if (!rawContent || !rawContent.trim()) {
    throw new Error("AI 返回了空内容，请检查 API Key 余额或重试");
  }

  let cleaned = rawContent.trim();

  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 提取最外层 { ... } — 处理 AI 在 JSON 前后加说明文字的情况
  const startBrace = cleaned.indexOf("{");
  const endBrace = cleaned.lastIndexOf("}");
  if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
    cleaned = cleaned.slice(startBrace, endBrace + 1);
  }

  // 尝试修复常见 JSON 问题：尾逗号、中文引号等
  cleaned = cleaned
    .replace(/，/g, ",")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/、/g, ",");

  let skeleton;
  try {
    skeleton = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error("[plot_designer] JSON 解析失败。原始返回(前500字符):",
                  rawContent.slice(0, 500));
    throw new Error("AI 返回的内容无法解析为 JSON，请重试");
  }

  // 校验必填字段
  const requiredFields = ["title", "coreConflict", "protagonistStrategy", "opponentStrategy",
    "plotBeats", "turningPoint", "endingState", "unresolvedHook"];
  if (richness >= 1) {
    skeleton.sceneBreakdown = skeleton.sceneBreakdown || [];
    skeleton.emotionalArc = skeleton.emotionalArc || "";
    skeleton.dialogueHooks = skeleton.dialogueHooks || [];
  }
  if (richness >= 2) {
    skeleton.pacingNotes = skeleton.pacingNotes || "";
    skeleton.foreshadowing = skeleton.foreshadowing || [];
  }
  // original requiredFields variable;
  const missing = requiredFields.filter(function (f) { return !skeleton[f]; });
  if (missing.length > 0) {
    console.error("[plot_designer] 缺少字段:", missing,
                  "已收到:", JSON.stringify(skeleton).slice(0, 400));
    throw new Error("AI 返回的骨架缺少以下字段: " + missing.join(", "));
  }

  // 规范化 plotBeats 为数组
  if (!Array.isArray(skeleton.plotBeats)) {
    skeleton.plotBeats = [skeleton.plotBeats];
  }
  skeleton.plotBeats = skeleton.plotBeats.filter(Boolean);

  // 截断过长字符串
  var strFields = ["title", "coreConflict", "protagonistStrategy", "opponentStrategy",
                    "turningPoint", "endingState", "unresolvedHook"];
  strFields.forEach(function (f) {
    if (typeof skeleton[f] === "string" && skeleton[f].length > 500) {
      skeleton[f] = skeleton[f].slice(0, 500);
    }
  });

  return skeleton;
}

async function handleGenerateRoute(req, res) {
  try {
    const {
      task, systemPrompt, userPrompt,
      chapterId, projectId, chapterTitle, chapterSummary, projectGenre,
      temperature, maxTokens, provider: providerName
    } = req.body || {};

    // plot_designer 走专用非流式路由
    if (task === "plot_designer") {
      return await handlePlotDesignerRoute(req, res);
    }

    if (!userPrompt && !chapterId) {
      return res.status(400).json({ success: false, error: "userPrompt or chapterId is required" });
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

    // 章节生成固定走 DeepSeek，除非前端显式指定 provider
    const isChapterGen = (chapterId && projectId) || task === "chapter_generate";
    const provider = isChapterGen
      ? getProviderForTask("chapter_generate")
      : getProvider(providerName);
    if (!provider.apiKey) {
      res.write(`data: ${JSON.stringify({ error: `${provider.name} 未配置 API Key` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // ── 上下文装配模式：chapterId + projectId 存在时服务端装配 ──
    let usedItems = null;
    let finalSystemPrompt = systemPrompt || (task ? TASK_SYSTEM_PROMPTS[task] : "") || "";
    let finalUserPrompt = userPrompt;

    if (chapterId && projectId) {
      try {
        const ctx = await buildChapterContext(chapterId, projectId);
        usedItems = ctx.usedItems;
        finalSystemPrompt = buildSystemPrompt(projectGenre, ctx.contextBlock);
        finalUserPrompt = userPrompt || buildUserPrompt(chapterTitle, chapterSummary);
      } catch (ctxErr) {
        console.error("[generate] context build failed:", ctxErr.message);
        if (!finalUserPrompt) {
          res.write(`data: ${JSON.stringify({ error: "上下文装配失败: " + ctxErr.message })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
      }
    }

    let tokenCount = 0;

    try {
      const stream = provider.generateStream({
        systemPrompt: finalSystemPrompt,
        userPrompt: finalUserPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 6000,
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

    // done 事件中附带 usedItems
    const donePayload = { done: true };
    if (usedItems) {
      donePayload.usedItems = usedItems;
    }
    res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
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



// ── 剧情设计器辅助函数（按输入充实度分级）──
function _buildPlotDesignerPrompt(richness) {
  var base = '你是一位剧情结构设计师。根据用户提供的博弈结构，设计本章的详细剧情骨架。';

  if (richness >= 2) {
    base += '\n\n用户提供了非常详尽的博弈信息。请进行深度分析，输出包含以下全部字段的 JSON：\n' +
      '· 每个 plotBeat 详细展开为场景描述 + 人物动作 + 对话片段 + 微转折\n' +
      '· sceneBreakdown: 3-5 个具体场景的细分（地点、氛围、冲突焦点、人物微表情变化）\n' +
      '· emotionalArc: 主角从开篇到结尾的情绪变化曲线\n' +
      '· pacingNotes: 节奏控制建议\n' +
      '· foreshadowing: 本章应埋下的伏笔清单';
  } else if (richness >= 1) {
    base += '\n\n用户提供了中等详尽的信息。请进行标准分析，输出以下 JSON：\n' +
      '· 每个 plotBeat 附带对话线索\n' +
      '· sceneBreakdown: 2-3 个关键场景的概述\n' +
      '· emotionalArc: 主角情绪走向';
  } else {
    base += '\n\n用户提供了基本博弈信息。请输出核心剧情骨架，聚焦关键冲突和转折。';
  }

  base += '\n\n基础字段（必须）：\n' +
    '{\n' +
    '  "title": "章节标题（≤15字）",\n' +
    '  "coreConflict": "核心冲突",\n' +
    '  "protagonistStrategy": "主角策略",\n' +
    '  "opponentStrategy": "对手策略",\n' +
    '  "plotBeats": ["节拍1：开场钩子", "节拍2：交锋", "节拍3：转折", "节拍4：收尾"],\n' +
    '  "turningPoint": "转折点",\n' +
    '  "endingState": "收尾状态",\n' +
    '  "unresolvedHook": "悬念钩子"';

  if (richness >= 1) {
    base += ',\n  "dialogueHooks": ["对话线索"],\n' +
      '  "emotionalArc": "情绪变化",\n' +
      '  "sceneBreakdown": [{"scene":"场景名","location":"地点","focus":"冲突焦点"}]';
  }
  if (richness >= 2) {
    base += ',\n  "pacingNotes": "节奏建议",\n' +
      '  "foreshadowing": ["伏笔"]';
  }
  base += '\n}\n\n重要：只输出一行合法 JSON。不要 markdown 代码块，不要额外文字。';

  return base;
}

function _buildPlotDesignerUserPrompt(fields) {
  var lines = ['请根据以下博弈结构，设计本章的剧情骨架（必须返回 JSON）：', ''];
  lines.push('主角方：' + fields.protagonistName);
  if (fields.protagonistGoal) lines.push('主角目标：' + fields.protagonistGoal);
  lines.push('对手方：' + fields.opponentName);
  if (fields.opponentGoal) lines.push('对手目标：' + fields.opponentGoal);
  if (fields.informationGap) lines.push('关键信息差：' + fields.informationGap);
  if (fields.expectedOutcome) lines.push('预期结果：' + fields.expectedOutcome);

  if (fields.richness >= 2) {
    lines.push('');
    lines.push('【详细分析要求】请进行完整的场景级细分。每个 plotBeat 应包含具体场景、人物动作和对话线索。输出所有可选字段。');
  } else if (fields.richness >= 1) {
    lines.push('');
    lines.push('【标准分析要求】请在基础骨架上增加关键对话线索和场景概述。');
  }

  return lines.join('\n');
}

module.exports = { getProvider, getProviderForTask, getProviderInfo, handleGenerateRoute, handlePlotDesignerRoute, parseAndValidateSkeleton, hasApiKey, missingKeyMessage, TASK_SYSTEM_PROMPTS, MODEL_CONFIG };
