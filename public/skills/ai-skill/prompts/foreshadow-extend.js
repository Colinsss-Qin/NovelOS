/* Foreshadow Extend — 伏笔识别与扩展 */
AISkillPrompts["foreshadow_extend"] = {
  task: "foreshadow_extend",
  version: 1,
  description: "识别已有伏笔，建议新伏笔，规划回收时机",
  defaults: { temperature: 0.7, maxTokens: 1024 },
  systemTemplate: "你是一位小说结构分析师，擅长伏笔的埋设与回收。请根据提供的正文内容，完成以下任务：1) 识别文中已埋下的伏笔(列出3-5个) 2) 建议可在本章新增的伏笔(2-3个) 3) 为每个伏笔建议回收的时机(大致在第几章) 4) 输出编号列表格式。",
  userTemplate: "{{context.assembled}}\n\n---\n\n请分析以上正文中的伏笔。"
};
