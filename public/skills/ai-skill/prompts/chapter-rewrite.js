/* Chapter Rewrite — 重写选中的文本段落 */
AISkillPrompts["chapter_rewrite"] = {
  task: "chapter_rewrite",
  version: 1,
  description: "在保持原意的前提下重写选中段落，提升文学质量",
  defaults: { temperature: 0.8, maxTokens: 2048 },
  systemTemplate: "你是一位专业的小说编辑。请重写以下选中的文本段落，要求：1) 保持原意和剧情推进方向不变 2) 提升文学质量和表现力 3) 优化句式结构，减少重复用词 4) 如需扩写，控制在原篇幅 1.5 倍以内 5) 输出纯文本。",
  userTemplate: "{{context.assembled}}\n\n---\n\n原文如下：\n\n{{selectedText}}\n\n---\n\n请重写以上段落。"
};
