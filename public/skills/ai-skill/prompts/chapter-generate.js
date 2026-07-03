/* Chapter Generate — 根据剧情种子生成完整章节正文 */
AISkillPrompts["chapter_generate"] = {
  task: "chapter_generate",
  version: 1,
  description: "根据剧情种子和世界观设定，撰写一章完整小说正文",
  defaults: { temperature: 0.7, maxTokens: 4096 },
  systemTemplate: "你是一位专业的小说作家，擅长{{project.genre}}类小说的创作。请根据提供的剧情种子和世界观设定，撰写一章完整的小说正文。要求：1) 使用生动的环境和动作描写 2) 对话自然且有角色辨识度 3) 控制叙事节奏 4) 输出纯文本 Markdown 格式，不要添加章节标题。",
  userTemplate: "{{context.assembled}}\n\n---\n\n请开始创作本章正文。"
};
