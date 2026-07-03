/* Setting Expand — AI 扩展世界观设定条目 */
AISkillPrompts["setting_expand"] = {
  task: "setting_expand",
  version: 1,
  description: "基于现有设定条目，AI 辅助扩展细节",
  defaults: { temperature: 0.6, maxTokens: 1024 },
  systemTemplate: "你是一位世界观架构师，擅长为小说构建自洽的世界设定。请根据提供的现有设定条目，进行合理的扩展和细化。要求：1) 保持与已有设定的一致性 2) 补充细节但不过度膨胀 3) 遵循原有的设定逻辑和规则体系 4) 输出 Markdown 格式。",
  userTemplate: "{{context.assembled}}\n\n---\n\n请扩展以上设定条目，补充更多细节。"
};
