/* ================================================================
   Context Router - small chapter context pack for Writing Studio
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");

const TYPE_GROUPS = {
  locations: ["location"],
  factions: ["faction"],
  rules: ["rule", "history_event", "lore"],
};

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(",").map((tag) => tag.trim()).filter(Boolean);
}

function parseAttrs(item) {
  try {
    return JSON.parse(item.attrsJson || "{}");
  } catch {
    return {};
  }
}

function chapterKeywords(chapter, scenes) {
  const text = [
    chapter?.title,
    chapter?.summary,
    chapter?.content,
    ...(scenes || []).flatMap((scene) => [scene.title, scene.summary]),
  ].filter(Boolean).join(" ").toLowerCase();

  return new Set(
    text
      .split(/[\s,，。！？、；：:;.!?()[\]{}"'“”‘’《》<>|/\\-]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2)
  );
}

function scoreText(keywords, parts) {
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  keywords.forEach((word) => {
    if (haystack.includes(word)) score += 2;
  });
  return score;
}

function byScoreThenRecent(a, b) {
  if (b._score !== a._score) return b._score - a._score;
  return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
}

function selectRelevant(items, keywords, partsFn, limit) {
  return items
    .map((item) => ({ ...item, _score: scoreText(keywords, partsFn(item)) }))
    .sort(byScoreThenRecent)
    .slice(0, limit)
    .map(({ _score, ...item }) => item);
}

function itemDto(item) {
  return {
    id: item.id,
    projectId: item.projectId,
    type: item.type,
    name: item.name,
    aliases: splitTags(item.aliases),
    summary: item.summary || "",
    description: item.description || "",
    tags: splitTags(item.tags),
    attrs: parseAttrs(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function characterDto(character) {
  return {
    id: character.id,
    projectId: character.projectId,
    name: character.name,
    alias: character.alias || "",
    role: character.role || "",
    gender: character.gender || "未知",
    race: character.race || "人类",
    occupation: character.occupation || "",
    appearance: character.appearance || "",
    personality: character.personality || "",
    background: character.background || "",
    goal: character.goal || "",
    motivation: character.motivation || "",
    notes: character.notes || "",
    status: character.status || "active",
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
}

function futureSceneDto(scene) {
  return {
    id: scene.id,
    projectId: scene.projectId,
    title: scene.title,
    summary: scene.summary || "",
    emotionGoal: scene.emotionGoal || "",
    sceneType: scene.sceneType || "",
    importance: scene.importance || "medium",
    status: scene.status,
    triggerConditions: scene.triggerConditions || "",
    prerequisiteEvents: scene.prerequisiteEvents || "",
    notes: scene.notes || "",
    tags: splitTags(scene.tags),
    expectedChapterId: scene.expectedChapterId || "",
    createdAt: scene.createdAt,
    updatedAt: scene.updatedAt,
  };
}

router.get("/chapter", async (req, res, next) => {
  try {
    const { projectId, chapterId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });

    const chapter = chapterId
      ? await prisma.chapter.findFirst({ where: { id: chapterId, projectId } })
      : null;
    const scenes = chapterId
      ? await prisma.scene.findMany({ where: { chapterId }, orderBy: { order: "asc" } })
      : [];
    const keywords = chapterKeywords(chapter, scenes);

    const [characters, items, futureScenes] = await Promise.all([
      prisma.character.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.unifiedItem.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" }, take: 300 }),
      prisma.futureScene.findMany({ where: { projectId }, orderBy: [{ importance: "desc" }, { updatedAt: "desc" }], take: 100 }),
    ]);

    const relevantCharacters = selectRelevant(
      characters,
      keywords,
      (character) => [
        character.name,
        character.alias,
        character.role,
        character.occupation,
        character.personality,
        character.background,
        character.goal,
        character.notes,
      ],
      8
    ).map(characterDto);

    const itemParts = (item) => [
      item.name,
      item.aliases,
      item.summary,
      item.description,
      item.tags,
      JSON.stringify(parseAttrs(item)),
    ];
    const byTypes = (types) => items.filter((item) => types.includes(item.type));
    const locations = selectRelevant(byTypes(TYPE_GROUPS.locations), keywords, itemParts, 8).map(itemDto);
    const factions = selectRelevant(byTypes(TYPE_GROUPS.factions), keywords, itemParts, 8).map(itemDto);
    const rules = selectRelevant(byTypes(TYPE_GROUPS.rules), keywords, itemParts, 8).map(itemDto);

    const futureSceneCandidates = selectRelevant(
      futureScenes,
      keywords,
      (scene) => [
        scene.title,
        scene.summary,
        scene.emotionGoal,
        scene.sceneType,
        scene.triggerConditions,
        scene.prerequisiteEvents,
        scene.notes,
        scene.tags,
      ],
      6
    ).map(futureSceneDto);

    res.json({
      success: true,
      data: {
        chapter: chapter
          ? {
              id: chapter.id,
              projectId: chapter.projectId,
              volumeId: chapter.volumeId || "",
              title: chapter.title,
              summary: chapter.summary || "",
              status: chapter.status,
              wordCount: chapter.wordCount,
              order: chapter.order,
              updatedAt: chapter.updatedAt,
            }
          : { id: chapterId || "", projectId, title: "", summary: "", status: "", wordCount: 0, order: 0 },
        scenes,
        characters: relevantCharacters,
        locations,
        factions,
        rules,
        futureScenes: futureSceneCandidates,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
