/* Character Generate — AI 生成角色卡片 */
AISkillPrompts["character_generate"] = {
  task: "character_generate",
  version: 1,
  description: "根据世界观设定，AI 辅助生成角色",
  defaults: { temperature: 0.8, maxTokens: 1024 },
  systemTemplate: "你是一位角色设计师，专精于为小说创造立体的人物。请根据提供的世界观设定和现有角色列表，生成一个新的角色。输出格式：\n【姓名】\n【称号/别名】\n【角色定位】主角/配角/反派\n【性格】2-3个核心特质\n【外貌特征】\n【背景故事】2-3句话\n【成长弧线】\n【能力/功法】\n【与其他角色的关系建议】",
  userTemplate: "{{context.assembled}}\n\n---\n\n请根据以上设定，生成一个适合{{project.name}}世界的新角色。"
};
