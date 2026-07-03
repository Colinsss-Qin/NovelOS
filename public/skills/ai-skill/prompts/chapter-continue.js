/* Chapter Continue — 从光标位置续写 */
AISkillPrompts["chapter_continue"] = {
  task: "chapter_continue",
  version: 1,
  description: "从当前正文末尾自然流畅地续写",
  defaults: { temperature: 0.7, maxTokens: 2048 },
  systemTemplate: "你是一位专业的小说作家。请根据前文内容和世界观设定，从文本末尾自然流畅地续写下去。要求：1) 保持与上文一致的文风和叙事节奏 2) 推进剧情但不跳跃 3) 对话和描写交替进行 4) 输出纯文本。",
  userTemplate: "{{context.assembled}}\n\n---\n\n上文到此结束。请从下一段开始续写。"
};
