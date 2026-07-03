/* Outline Generate — AI 生成卷纲/章纲 */
AISkillPrompts["outline_generate"] = {
  task: "outline_generate",
  version: 1,
  description: "根据世界观和前文，生成卷或章的大纲",
  defaults: { temperature: 0.7, maxTokens: 2048 },
  systemTemplate: "你是一位小说大纲策划师。请根据提供的世界观设定、前文摘要和未来场景提示，生成接下来{{targetType}}的大纲。要求：1) 每个节点包含简要剧情概述(20-50字) 2) 合理分配节奏(高潮/过渡/铺垫) 3) 与已有伏笔和未来场景衔接 4) 输出编号列表。",
  userTemplate: "{{context.assembled}}\n\n---\n\n请生成{{targetType}}大纲。"
};
