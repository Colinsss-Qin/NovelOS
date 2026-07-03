const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak
} = require('docx');
const fs = require('fs');

// ---------- helpers ----------
const FONT = "Arial";

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, line: 320 },
    children: [new TextRun({ text, ...opts })]
  });
}
function bodyMixed(runs) {
  return new Paragraph({ spacing: { after: 160, line: 320 }, children: runs });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 300 },
    children: [new TextRun(text)]
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { after: 80, line: 300 },
    children: [new TextRun(text)]
  });
}
function label(text) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text, bold: true, color: "8A5A2A" })]
  });
}
function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D9D2C5" } },
    children: [new TextRun("")]
  });
}
function quoteNote(text) {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: "C9A66B" } },
    children: [new TextRun({ text, italics: true, color: "555555" })]
  });
}

// simple table builder: header row + data rows, column widths in DXA (must sum to 9360)
function makeTable(headers, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const total = widths.reduce((a, b) => a + b, 0);

  function cell(text, opts = {}) {
    return new TableCell({
      borders,
      width: { size: opts.width, type: WidthType.DXA },
      shading: opts.header ? { fill: "2C2B44", type: ShadingType.CLEAR } : (opts.shade ? { fill: "F5F1E8", type: ShadingType.CLEAR } : undefined),
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text, bold: !!opts.header, color: opts.header ? "FFFFFF" : "1A1A1A", size: 20 })]
      })]
    });
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((htext, i) => cell(htext, { header: true, width: widths[i] }))
  });

  const dataRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => cell(c, { width: widths[i], shade: ri % 2 === 1 }))
  }));

  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows]
  });
}

// ---------- content ----------
const children = [];

// ===== Cover =====
children.push(
  new Paragraph({ spacing: { before: 1200, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "NovelOS", bold: true, size: 64, color: "8A5A2A" })] }),
  new Paragraph({ spacing: { after: 400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "产品需求文档 (PRD) v0.2 · 收窄与细化版", size: 28, color: "555555" })] }),
);

children.push(makeTable(
  ["项目", "内容"],
  [
    ["版本", "v0.2（收窄版，基于 v0.1 概念原型整理）"],
    ["日期", "2026-06-19"],
    ["状态", "内部讨论稿，尚未进入开发"],
    ["读者对象", "产品作者本人；后续将作为 Claude Code 实施开发的依据"],
    ["上一版本", "NovelOS PRD v0.1（含 HTML 概念原型，无真实数据/交互逻辑）"],
  ],
  [2200, 7160]
));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ===== 0. 文档说明 =====
children.push(h1("0. 文档说明"));
body_list = [
  "这份文档是在 NovelOS PRD v0.1（原型阶段）基础上的收窄与细化版本，目的有两个：",
];
children.push(body(body_list[0]));
children.push(numbered("把“概念原型”转化为“可被一步步实现的产品规格”，明确哪些做、哪些先不做、谁来对每一类数据拍板。"));
children.push(numbered("作为后续直接交给 Claude Code 进行开发（“vibe coding”）的依据——每个模块都给到具体到字段 / 状态 / 触发条件级别的描述，而不是停留在愿景层面。"));
children.push(body("本文档不包含数据库表结构、API 设计等纯技术实现细节，这部分会在产品设计确认后，单独整理为面向工程实现的技术文档（如 CLAUDE.md / ARCHITECTURE.md）。"));

// ===== 1. 产品定位 =====
children.push(h1("1. 产品定位"));
children.push(body("NovelOS 是一套面向小说作者的 AI 创作操作系统。当前阶段目标用户为产品作者本人——不考虑多用户、账号体系、服务端权限管理。"));
children.push(body("它和“写作辅助工具”的本质区别："));
children.push(bullet("传统写作软件：作者写文本，工具帮助排版 / 检索 / 校对。"));
children.push(bullet("NovelOS：作者管理“世界”（设定、人物、势力、剧情结构、目标场景），AI 负责把这些结构化信息转化为具体的章节正文。"));
children.push(quoteNote("也就是说，产品要做好的核心能力不是“编辑器多好用”，而是“AI 生成章节时，能不能稳定地、不遗漏地用上你维护的所有设定”。这是贯穿整份文档的设计主线。"));

// ===== 2. 目标用户与核心痛点 =====
children.push(h1("2. 目标用户与核心痛点"));
children.push(body("沿用 v0.1 的用户画像，无变化："));

children.push(h3("世界观型作者"));
children.push(body("特点：喜欢设计设定 / 人物 / 势力 / 地图，不喜欢写正文。"));
children.push(body("痛点：设定越堆越多，正文越写越少——设定本身变成了创作的终点，而不是起点。"));

children.push(h3("网文作者"));
children.push(body("特点：高频更新。"));
children.push(body("痛点：更新压力大，写多了容易忘记 / 写歪已经设定好的细节（“吃设定”）。"));

children.push(h3("编剧 / 长篇结构型作者"));
children.push(body("特点：关注剧情结构。"));
children.push(body("痛点：长篇跨度大，人工维护一致性的成本随章节数线性甚至指数增长。"));

children.push(quoteNote("当前阶段产品只服务“我自己”，但这三类画像可以帮助我们在做功能取舍时自问：“这个功能解决的是哪一类用户的哪一个具体痛点？”如果答不出来，这个功能本阶段就不该做。"));

// ===== 3. 产品目标 =====
children.push(h1("3. 产品目标"));
children.push(body("沿用 v0.1 的四个目标，但做了优先级上的取舍说明："));

children.push(label("掌控感"));
children.push(body("任何时候打开产品，都能在 30 秒内看清“这本书现在是什么状态”——不需要翻聊天记录、翻 Word 文档去回忆设定。"));

children.push(label("推进感"));
children.push(body("核心动作循环要短而清晰：选大纲节点 → AI 生成 → 确认 / 修改 → 落地为正文 → 推进到下一节点。每次打开都有“往前走了一步”的感觉，而不是又要重新决定“现在该干嘛”。"));

children.push(label("成就感"));
children.push(body("看得见的进度——已完成章节数 / 总章节数、设定库的丰富程度，这些是低成本但有效的正反馈。"));

children.push(label("沉浸感（本阶段刻意降级）"));
children.push(body("v0.1 中“与角色互动”“世界模拟器”等沉浸感功能属于 V3 的远期方向，本阶段不追求，先把“掌控感 + 推进感 + 成就感”这三项做扎实。"));

// ===== 4. 版本范围说明 =====
children.push(h1("4. 版本范围说明（本次收窄的核心结论）"));
children.push(body("把 v0.1 列出的功能，按“是否需要可靠的跨章节自动推理”重新分类，而不是沿用 v0.1 原本“第一阶段 / V2 / V3”的分法。原因：v0.1 的分法把“结构化数据管理类”和“AI 自动判断类”功能混在了同一阶段，但这两者的实现难度、出错后的代价完全不是一个量级。"));

children.push(h2("V1（本阶段要做）"));
children.push(body("判断标准：功能本身是“结构化数据的增删改查 + 检索 + 按需注入 AI 上下文”，AI 的产出始终是“建议”，最终写入数据的内容由你确认。"));
children.push(bullet("Story Bible 故事圣经"));
children.push(bullet("Story Map 故事地图（大纲树）"));
children.push(bullet("Future Scene 未来场景库"));
children.push(bullet("Writing Studio 创作台（AI 章节生成 / 续写 / 润色）"));
children.push(bullet("War Room 作战室（仪表盘，仅展示 V1 范围内已有的真实数据）"));

children.push(h2("暂缓（V2 / V3，本阶段不做，详见第 8 节）"));
children.push(body("判断标准：功能需要 AI 读取大段历史正文并做跨章节一致性推理或数值判定，且推理结果会被当作“事实”自动写入系统状态。"));
children.push(bullet("Story Compiler 故事编译器（自动检测设定冲突 / 人物崩坏 / 时间线错误 / 伏笔遗漏）"));
children.push(bullet("World State 世界状态自动同步（势力数值、人物关系状态随章节自动演化）"));
children.push(bullet("世界地图可视化、势力面板自动演化"));
children.push(bullet("Story Quest 任务系统（进度百分比自动判定）"));
children.push(bullet("世界模拟器、AI 角色代理、NPC 自主行动"));

children.push(quoteNote("这个收窄不代表“编译器”“世界状态”这些想法不好——它们正是 NovelOS 区别于普通写作工具的关键卖点，只是需要先在 V1 跑出真实的章节数据积累、并验证 AI 推理的可信度，再决定要不要做、做成全自动还是半自动。强行在第一版就做，容易导致数据被 AI 的错误推断污染，而你既没有简单的办法发现，也没有办法批量纠正。"));

// ===== 5. V1 核心模块设计 =====
children.push(h1("5. V1 核心模块设计"));

// 5.1
children.push(h2("5.1 Story Bible 故事圣经"));
children.push(label("定位"));
children.push(body("世界观的单一事实来源（Single Source of Truth）。所有生成任务的上下文，都从这里取材，不从聊天记录里临时找。"));
children.push(label("条目类型"));
children.push(bullet("人物（Character）：姓名、身份 / 阵营、性格、外貌、成长弧线、当前状态描述（自由文本，不做数值化）"));
children.push(bullet("势力 / 组织（Faction）：名称、性质、与主角关系、当前处境描述"));
children.push(bullet("地点（Location）：名称、描述、归属"));
children.push(bullet("规则体系（System）：例如修炼体系 / 魔法体系 / 科技体系的设定规则，这是网文最容易“前后矛盾”的地方，需要重点支持"));
children.push(bullet("历史背景（Lore）：世界观的历史事件，影响当前剧情走向但不一定逐章出现"));
children.push(body("每个条目支持打标签，方便 AI 生成时按需检索，而不是无脑塞进上下文。"));
children.push(label("AI 能力（V1 范围内）"));
children.push(bullet("根据你写的章节正文，提取“疑似新设定”草稿，由你确认是否收录进圣经（不自动写入）"));
children.push(bullet("检测同名 / 近似条目，提示你是否要合并（提示，不自动合并）"));
children.push(label("本阶段明确不做"));
children.push(body("自动判定“设定冲突”（如“风灵石等级前后描述不一致”这种跨条目交叉检查），这是 V2 Compiler 的范畴。"));

// 5.2
children.push(h2("5.2 Story Map 故事地图（大纲树）"));
children.push(label("定位"));
children.push(body("管理“小说 → 卷 → 章 → 场景 / 情节点”的层级结构，是 War Room 和 Writing Studio 之间的枢纽。"));
children.push(label("层级"));
children.push(body("小说（项目）→ 卷（Volume）→ 章（Chapter）→ 情节点（Beat，章节内的小节奏点，可选粒度，见第 7 节开放问题）"));
children.push(label("每个节点字段"));
children.push(body("标题、一句话梗概、状态（草稿 / 已确认 / 已生成正文 / 已定稿）、关联的故事圣经条目（人物 / 势力 / 地点）、关联的未来场景"));
children.push(label("AI 能力"));
children.push(bullet("输入“这一卷大概想讲什么”，AI 生成候选章纲列表，你逐条采纳 / 修改 / 丢弃"));
children.push(bullet("支持手动拖拽调整顺序（沿用原型的交互形式）"));
children.push(label("人工确认点"));
children.push(body("AI 生成的章纲默认是草稿状态，不会被 Writing Studio 当作“已确定的剧情”去生成正文，除非你手动把状态改成“已确认”。"));
children.push(label("本阶段明确不做"));
children.push(body("AI 自动重构整条大纲树（v0.1 提到的“自动重构”），本阶段拖拽调整全部由人工完成。"));

// 5.3
children.push(h2("5.3 Future Scene 未来场景库"));
children.push(label("定位"));
children.push(body("先记录“你想写的高光时刻”，再倒推情节怎么走到那里——这是反向规划，能直接缓解“不知道写啥”的卡文状态。"));
children.push(label("每个场景字段"));
children.push(bullet("标题、画面描述 / 经典台词草稿"));
children.push(bullet("情绪目标（如“虐”“爽”“高燃”）"));
children.push(bullet("触发条件（用自然语言描述，例如“主角集齐三件信物后”）"));
children.push(bullet("预计关联的卷 / 章（可留空，不要求提前精确定位）"));
children.push(bullet("状态（构思中 / 已关联章节 / 已实现）"));
children.push(label("AI 能力"));
children.push(body("在生成章纲或正文时，如果检测到当前剧情接近某个未来场景的触发条件，提示“是否要在这里埋下伏笔 / 做铺垫”——同样是提示，不自动改写大纲。"));
children.push(label("本阶段明确不做"));
children.push(body("v0.1 提到的“自动分析触发条件 / 前置剧情 / 预计位置 / 完成进度”，这几项都依赖跨章节推理，本阶段触发条件由人工填写，状态由人工切换。"));

// 5.4
children.push(h2("5.4 Writing Studio 创作台"));
children.push(label("定位"));
children.push(body("实际写正文的地方，是整个产品价值的最终落点——前面三个模块做得再好，如果这里生成的正文质量不行，或者用不上前面的设定，产品就没有意义。"));
children.push(label("核心功能"));
children.push(bullet("生成章节：基于当前 Story Map 节点的梗概 + AI 工作流组装的上下文（见第 6 节），生成正文草稿"));
children.push(bullet("续写：基于已有正文，继续往下写"));
children.push(bullet("重写 / 润色：选中一段已有正文，要求 AI 按指令调整（如“强化冲突”“增加环境描写”“加快节奏”）"));
children.push(label("编辑器交互"));
children.push(body("沿用原型的左文右 context 布局——左侧是正文编辑区，右侧实时展示本章关联的人物 / 设定 / AI 上下文摘要，让你在写 / 生成的同时能确认“AI 这次到底参考了什么”。"));
children.push(quoteNote("右侧 context 面板不只是装饰，是排查“AI 为什么写歪了”的关键工具——出问题时第一时间能看到是不是上下文漏带了某个设定。"));
children.push(label("人工确认点"));
children.push(body("AI 生成的正文默认是草稿，不自动覆盖已有正文，也不自动把章节状态改成“已定稿”。"));

// 5.5
children.push(h2("5.5 War Room 作战室"));
children.push(label("定位"));
children.push(body("产品首页，30 秒内看清当前状态。是个仪表盘，本身不承载新的业务逻辑，只整合展示前四个模块已经存在的真实数据。"));
children.push(label("展示内容（对照 v0.1 原型做了删减）"));
children.push(bullet("当前项目、当前卷、当前章节"));
children.push(bullet("总体进度：已完成章节数 / 计划总章节数（基于 Story Map 中实际的章节数量与状态统计，不是 AI 估算）"));
children.push(bullet("待处理事项：Story Bible 中待确认的疑似新设定、Story Map 中标记“草稿”待确认的章纲、Future Scene 中已满足触发条件提示但尚未处理的场景"));
children.push(bullet("AI 建议入口：生成下一章 / 继续完善大纲 等快捷操作"));
children.push(label("V1 不展示（对照 v0.1 原型的删减）"));
children.push(body("编译器告警卡片（设定冲突 / 伏笔未收提示，依赖 V2 Compiler）、世界状态卡片（势力数值，依赖 V2 World State）。这两块在 V1 阶段先不放在首页，等 V2 真正实现后再加回来，避免首页出现“看起来很酷但背后是假数据”的卡片。"));

// ===== 6. AI 工作流总览 =====
children.push(h1("6. AI 工作流总览（生成章节时，产品层面描述）"));
children.push(body("当你在 Writing Studio 点击“生成章节”时，系统按以下逻辑组装上下文后发送给模型："));
children.push(numbered("取当前 Story Map 节点的标题与梗概"));
children.push(numbered("取该节点关联的人物条目（来自 Story Bible，只取出现在本章梗概里提到的人物，不是全量人物，避免上下文爆炸）"));
children.push(numbered("取相关的设定条目（规则体系 / 地点 / 势力，按标签匹配）"));
children.push(numbered("取最近 1-2 章的正文摘要作为“前情”（不是全文，避免超出上下文窗口；摘要可以是人工写的“章节简述”字段，也可以让 AI 在保存章节时自动生成一份摘要供下次调用）"));
children.push(numbered("检查是否有关联的 Future Scene 临近触发，如果有，作为“本章可以埋的伏笔”提示一并带上"));
children.push(numbered("拼装为 prompt，调用你在设置中选择的模型（DeepSeek / Claude / KIMI，多 provider 抽象）"));
children.push(body("输出：章节正文草稿，连同“这次生成实际用到了哪些设定 / 场景”的清单一起返回，展示在 Writing Studio 右侧的 context 面板里，方便你核对。"));

// ===== 7. 关键产品决策 =====
children.push(h1("7. 关键产品决策（需要你拍板，附建议）"));
children.push(body("这里列出几个我没法替你决定、但会直接影响后续技术实现的问题："));

children.push(label("a）Story Bible 的“疑似新设定提取”，是进入独立待确认列表，还是直接高亮显示在正文旁？"));
children.push(body("建议：独立待确认列表，类似邮件收件箱，避免正文阅读体验被打断。"));

children.push(label("b）大纲树的“卷 / 章 / 情节点”三级，情节点这一级本阶段是否真的需要？"));
children.push(body("建议：V1 先只做“卷 / 章”两级，情节点等你实际用起来、发现章节内部确实需要更细粒度的节奏管理时再加，避免一开始就维护一个用不上的层级。"));

children.push(label("c）章节摘要（用于下一章生成时的“前情”）是人工填写还是 AI 自动生成？"));
children.push(body("建议：AI 在你点击“定稿”时自动生成一份摘要草稿，你可以手动修改，不需要每章都手写，但也不是完全黑盒。"));

children.push(label("d）是否需要“讨论式构思”界面（不直接生成正文，像聊天一样讨论“如果这样写会怎样”）？"));
children.push(body("建议：本阶段不做独立模块，Writing Studio 的“续写 / 重写”功能可以天然覆盖大部分讨论式构思的需求，先观察实际使用中是否还需要专门的对话界面。"));

// ===== 8. 暂缓功能 =====
children.push(h1("8. 暂缓功能（V2 / V3）及解锁条件"));
children.push(body("把 v0.1 中暂缓的功能列出来，并明确写清楚“现在为什么不做”和“什么情况下可以开始做”，避免被误解为“忘了”或“砍掉了”。"));

children.push(h3("Story Compiler 故事编译器"));
children.push(body("内容：自动检测设定冲突、人物崩坏、时间线错误、战力崩坏、伏笔遗漏"));
children.push(body("暂缓原因：需要 AI 对全部历史正文做跨章节一致性推理，错误的“冲突告警”比没有告警更糟——会让你浪费时间排查根本不存在的问题，反而磨损对工具的信任"));
children.push(body("解锁条件：V1 跑满至少一卷（建议 20+ 章）真实正文后，先做一个轻量的“人工触发式检测”（你主动点一下“检查这一卷”，而不是每章自动跑），观察误报率，误报率可接受后再考虑做成自动后台运行"));

children.push(h3("World State 世界状态自动同步"));
children.push(body("内容：势力数值（影响力 / 军力 / 经济 / 民心）随章节自动演化"));
children.push(body("暂缓原因：数值从正文里反推，本质上是让 AI 做主观判断题，且没有“标准答案”可供校验对错"));
children.push(body("解锁条件：先确认这些数值本阶段对你是不是真的有用（是用来辅助你写，还是只是好看的仪表盘？）。如果确认有用，V1 阶段可以先把这些数值做成“人工维护字段”（你自己定期手动调整），等积累了你自己的调整规律后，再考虑让 AI 学着辅助估算"));

children.push(h3("势力面板自动演化 / 人物关系图动态变化 / 世界地图可视化"));
children.push(body("暂缓原因：都依赖 World State 自动同步先跑通，是它的下游展示功能"));
children.push(body("解锁条件：同 World State"));

children.push(h3("Story Quest 任务系统（主线任务进度百分比）"));
children.push(body("暂缓原因：进度百分比同样依赖跨章节推理判定“这个子任务完成了多少”"));
children.push(body("解锁条件：可以考虑用更简单的方式替代——比如把“任务”直接做成 Future Scene 或 Story Map 节点的一种状态，不单独做百分比系统"));

children.push(h3("世界模拟器 / AI 角色代理 / NPC 自主行动"));
children.push(body("暂缓原因：这是 v0.1 远期方向里最远期的部分，需要 V1 / V2 都验证成熟之后才有意义去做"));
children.push(body("解锁条件：暂不设具体条件，作为产品的长期方向保留"));

// ===== 9. V1 验收标准 =====
children.push(h1("9. V1 验收标准"));
children.push(body("本阶段做完的标志，不是“功能都写完了”，而是这条链路能真实跑通一整章："));
children.push(numbered("在 Story Bible 里至少录入主角、一个关键配角、一条规则体系设定"));
children.push(numbered("在 Story Map 里创建一卷、一章，写好梗概，状态改为“已确认”"));
children.push(numbered("在 Writing Studio 点击“生成章节”，能看到右侧 context 面板正确展示出这次用到了哪些人物 / 设定（不是空的，也不是不相关的）"));
children.push(numbered("生成的正文里，人物名字、设定细节与 Story Bible 中的记录一致，没有出现“AI 自己编了一个新设定”的情况"));
children.push(numbered("War Room 首页能正确反映“已完成 1 / 计划 N 章”的真实进度"));
children.push(numbered("整个过程不需要离开产品去翻聊天记录找之前的设定"));

// ===== 10. 差异对照 =====
children.push(h1("10. 与 v0.1 原型的差异对照"));
children.push(makeTable(
  ["模块", "v0.1 原型", "v0.2（本文档）", "调整说明"],
  [
    ["War Room", "含编译器告警、世界状态卡片", "仅展示 V1 真实数据", "移除依赖自动推理的卡片，避免假数据"],
    ["Story Bible", "含“自动检测冲突 / 生成统一版本”", "仅含“疑似新设定提取建议”", "冲突检测移至 V2 Compiler"],
    ["Story Map", "含“自动重构”", "仅保留人工拖拽 + AI 生成候选章纲", "自动重构所需的可靠性本阶段达不到"],
    ["Future Scene", "含自动分析触发条件 / 完成进度", "触发条件 / 状态人工维护，AI 仅做临近提示", "避免自动写入不可靠数据"],
    ["World State", "影响力 / 军力 / 经济 / 民心自动演化", "移至 V2，本阶段不做", "见第 8 节"],
    ["Compiler", "自动检测四类问题", "移至 V2", "见第 8 节"],
    ["Story Quest", "自动判定任务进度", "移至 V2，建议改造为 Story Map 节点状态", "见第 8 节"],
    ["世界地图 / 势力面板", "可视化展示", "移至 V2，依赖 World State", "见第 8 节"],
  ],
  [1600, 2600, 3000, 2160]
));

children.push(divider());
children.push(body("（文档完）"));

// ---------- build doc ----------
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: "1A1A1A" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "C9A66B" } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "8A5A2A" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: FONT, color: "333333" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/novelos-prd/NovelOS_PRD_v0.2.docx", buffer);
  console.log("done");
});
