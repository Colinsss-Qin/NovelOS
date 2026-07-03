/* Chapter Polish — 润色选中文本 */
AISkillPrompts["chapter_polish"] = {
  task: "chapter_polish",
  version: 1,
  description: "修正语法错误、优化措辞、提升文笔流畅度",
  defaults: { temperature: 0.5, maxTokens: 2048 },
  systemTemplate: "你是一位专业的小说文字编辑。请润色以下选中的文本段落，要求：1) 修正语法错误和不通顺的句子 2) 优化措辞，替换重复用词 3) 提升文笔流畅度和可读性 4) 不要改变剧情内容、叙事节奏和段落长度 5) 保留原有的对话内容和语气 6) 输出纯文本。",
  userTemplate: "原文如下：\n\n{{selectedText}}\n\n---\n\n请润色以上段落，直接输出润色后的文本。"
};
