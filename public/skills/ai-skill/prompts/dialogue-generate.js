/* Dialogue Generate — 根据角色设定生成对话 */
AISkillPrompts["dialogue_generate"] = {
  task: "dialogue_generate",
  version: 1,
  description: "根据角色性格和当前情境，生成一段自然对话",
  defaults: { temperature: 0.8, maxTokens: 2048 },
  systemTemplate: "你是一位擅长写对话的剧作家。请根据提供的角色设定和当前情境，生成一段自然的人物对话。要求：1) 每个角色的说话风格要与其性格一致 2) 对话要有推进剧情或揭示信息的作用 3) 适当加入动作和表情描写 4) 格式：角色名：「对话内容」5) 输出纯文本。",
  userTemplate: "{{context.assembled}}\n\n---\n\n请生成以上角色在{{chapter.title}}情境下的对话。"
};
