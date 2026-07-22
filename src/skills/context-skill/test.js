/* ================================================================
   测试 context-skill/assembler.js
   播种关联数据 → 调用 buildChapterContext → 验证各层输出
   ================================================================ */

const { prisma } = require("../../lib/prisma");
const { buildChapterContext } = require("./assembler");

async function main() {
  console.log("══════════════════════════════════");
  console.log("  Context Assembler 测试");
  console.log("══════════════════════════════════\n");

  // ── 找测试章节 ──
  const chapter = await prisma.chapter.findFirst({
    include: { volume: true },
    orderBy: { order: "asc" },
  });

  if (!chapter) {
    console.log("❌ 数据库无章节，跳过测试");
    await prisma.$disconnect();
    return;
  }

  const projectId = chapter.projectId;
  console.log(`📖 测试章节: ${chapter.title} (${chapter.id})`);
  console.log(`📚 所属卷: ${chapter.volume?.title || "无"}`);
  console.log(`📦 项目: ${projectId}\n`);

  // ── 播种 Scene + 关联到人物 ──
  const characters = await prisma.character.findMany({
    where: { projectId },
    take: 3,
  });

  if (characters.length > 0) {
    console.log(`🧑 播种 Scene → 关联 ${characters.map(c => c.name).join(", ")}`);

    const existingScenes = await prisma.scene.findMany({
      where: { chapterId: chapter.id },
    });

    if (existingScenes.length === 0) {
      await prisma.scene.create({
        data: {
          projectId,
          chapterId: chapter.id,
          title: "测试场景-开局",
          summary: "主角初次登场",
          characterIds: JSON.stringify(characters.map(c => c.id)),
          locationIds: "[]",
          factionIds: "[]",
          order: 0,
        },
      });
      console.log("  ✓ Scene 已创建\n");
    }
  }

  // ── 播种 Rules ──
  let existingRules = await prisma.ruleSystem.findMany({
    where: { projectId },
  });

  if (existingRules.length === 0) {
    console.log("📜 播种规则体系...");
    await prisma.ruleSystem.createMany({
      data: [
        {
          projectId,
          category: "修炼体系",
          title: "灵力觉醒",
          content:
            "灵力是这个世界的基础能量。修炼者通过冥想和战斗积累灵力。灵力分为九阶，每突破一阶需要经历天劫。初阶灵力者为白色灵光，中阶为蓝色，高阶为金色。灵力属性分为五行：金木水火土，每个人天生偏向一种属性。灵力觉醒通常在十二岁左右发生，需要特定的触发条件，如濒死体验或强烈的情绪波动。灵力耗尽的修炼者会进入乏力期，需要三天恢复。",
        },
        {
          projectId,
          category: "世界地理",
          title: "七国格局",
          content:
            "大陆分为七国：苍云、凌霄、碧落、赤焰、玄冥、青木、黄金。各国之间以灵脉为界。苍云国以剑修为主，凌霄国以法术见长。七国之间每十年举行一次灵武大会，决定灵脉资源的分配。当前局势紧张，赤焰国与玄冥国结盟，对苍云国形成军事威胁。",
        },
        {
          projectId,
          category: "社会制度",
          title: "宗门等级",
          content:
            "宗门分为外门、内门、核心三个等级。外门弟子负责杂役，内门弟子可学习基础功法，核心弟子得传宗门秘法。晋升考核每年一次，通过率不足一成。宗门长老由核心弟子中的佼佼者担任，宗主必须是达到灵力七阶以上的强者。",
        },
        {
          projectId,
          category: "禁忌",
          title: "禁术反噬",
          content:
            "使用禁术会付出巨大代价。最常见的是生命力消耗、记忆丧失、灵力永久衰退。某些高级禁术甚至会导致灵魂分裂。历史上曾有修炼者因过度使用禁术而化为魔物，被七国联合剿灭。此事件后七国共同签署了《禁术公约》。",
        },
      ],
    });
    console.log("  ✓ 4 条规则已创建\n");
  }

  // ── 播种 Location ──
  let existingLocations = await prisma.location.findMany({
    where: { projectId },
  });

  if (existingLocations.length === 0) {
    console.log("📍 播种地点...");
    const loc = await prisma.location.create({
      data: {
        projectId,
        name: "黑石矿",
        type: "矿区",
        description: "苍云国最大的灵石矿场，位于北境荒原。矿工多为囚犯，条件恶劣。",
      },
    });

    // 给已有 Scene 加上 locationIds
    const scene = await prisma.scene.findFirst({
      where: { chapterId: chapter.id },
    });
    if (scene) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: { locationIds: JSON.stringify([loc.id]) },
      });
    }
    console.log("  ✓ 地点已创建并关联\n");
  }

  // ── 播种 Faction ──
  let existingFactions = await prisma.faction.findMany({
    where: { projectId },
  });

  if (existingFactions.length === 0) {
    console.log("🏛 播种势力...");
    const fac = await prisma.faction.create({
      data: {
        projectId,
        name: "苍云剑宗",
        type: "宗门",
        description: "苍云国第一剑修宗门，传承千年。现任宗主为剑圣·凌霄。",
        influence: 95,
        military: 80,
      },
    });

    const scene = await prisma.scene.findFirst({
      where: { chapterId: chapter.id },
    });
    if (scene) {
      const currentFactions = JSON.parse(scene.factionIds || "[]");
      currentFactions.push(fac.id);
      await prisma.scene.update({
        where: { id: scene.id },
        data: { factionIds: JSON.stringify(currentFactions) },
      });
    }
    console.log("  ✓ 势力已创建并关联\n");
  }

  // ── 链接 FutureScene ──
  const futureScenes = await prisma.futureScene.findMany({
    where: { projectId },
  });
  let linkedFuture = false;
  for (const fs of futureScenes) {
    if (!fs.expectedChapterId) {
      await prisma.futureScene.update({
        where: { id: fs.id },
        data: {
          expectedChapterId: chapter.id,
          triggerConditions: `在${chapter.title}中埋下伏笔`,
        },
      });
      linkedFuture = true;
    }
  }
  if (linkedFuture) {
    console.log("🔮 未来场景已关联到本章\n");
  }

  // ═══════════════════════════════════
  //  运行装配
  // ═══════════════════════════════════

  console.log("══════════════════════════════════");
  console.log("  调用 buildChapterContext()");
  console.log("══════════════════════════════════\n");

  const { contextBlock, usedItems } = await buildChapterContext(
    chapter.id,
    projectId
  );

  console.log("─── usedItems ───");
  console.log(JSON.stringify(usedItems, null, 2));

  console.log("\n─── contextBlock ───");
  console.log(contextBlock);
  console.log("\n─── 统计 ───");
  console.log(`总长度: ${contextBlock.length} 字符`);
  console.log(`人物条目: ${usedItems.characters.length}`);
  console.log(`地点条目: ${usedItems.locations.length}`);
  console.log(`势力条目: ${usedItems.factions.length}`);
  console.log(`规则条目: ${usedItems.rules.length}`);
  console.log(`上一章: ${usedItems.prevChapter || "无"}`);
  console.log(`未来场景: ${usedItems.futureScenes.length}`);

  await prisma.$disconnect();
  console.log("\n✅ 测试完成");
}

main().catch((err) => {
  console.error("❌ 测试失败:", err);
  process.exit(1);
});
