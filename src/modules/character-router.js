/* ================================================================
   Character Router - REST API for characters and relations
   Prisma-backed, mounted at /api/characters and /api/relations
   ================================================================ */

const express = require("express");
const { prisma } = require("../lib/prisma");

function toCharacterDto(character) {
  if (!character) return null;
  return {
    id: character.id,
    projectId: character.projectId,
    name: character.name,
    alias: character.alias || "",
    gender: character.gender || "未知",
    age: character.age || 0,
    birthday: character.birthday || "",
    race: character.race || "人类",
    occupation: character.occupation || character.role || "",
    appearance: character.appearance || "",
    personality: character.personality || "",
    background: character.background || "",
    goal: character.goal || "",
    motivation: character.motivation || "",
    status: character.status || "active",
    notes: character.notes || "",
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}

function toRelationDto(relation) {
  if (!relation) return null;
  return {
    id: relation.id,
    projectId: relation.projectId,
    sourceCharacterId: relation.characterAId,
    targetCharacterId: relation.characterBId,
    relationType: relation.relationType,
    description: relation.description || "",
    createdAt: relation.createdAt.toISOString(),
  };
}

function buildCharacterData(input, isCreate) {
  const data = {};
  if (input.projectId !== undefined) data.projectId = input.projectId;
  if (input.name !== undefined) data.name = String(input.name).trim();
  if (input.alias !== undefined) data.alias = input.alias || "";
  if (input.gender !== undefined) data.gender = input.gender || "未知";
  if (input.age !== undefined) data.age = parseInt(input.age, 10) || 0;
  if (input.birthday !== undefined) data.birthday = input.birthday || "";
  if (input.race !== undefined) data.race = input.race || "人类";
  if (input.occupation !== undefined) {
    data.occupation = input.occupation || "";
    data.role = input.occupation || "";
  }
  if (input.appearance !== undefined) data.appearance = input.appearance || "";
  if (input.personality !== undefined) data.personality = input.personality || "";
  if (input.background !== undefined) data.background = input.background || "";
  if (input.goal !== undefined) data.goal = input.goal || "";
  if (input.motivation !== undefined) data.motivation = input.motivation || "";
  if (input.status !== undefined) data.status = input.status || "active";
  if (input.notes !== undefined) data.notes = input.notes || "";

  if (isCreate) {
    if (data.alias === undefined) data.alias = "";
    if (data.gender === undefined) data.gender = "未知";
    if (data.age === undefined) data.age = 0;
    if (data.birthday === undefined) data.birthday = "";
    if (data.race === undefined) data.race = "人类";
    if (data.occupation === undefined) data.occupation = "";
    if (data.role === undefined) data.role = data.occupation || "";
    if (data.personality === undefined) data.personality = "";
    if (data.status === undefined) data.status = "active";
  }

  return data;
}

function handlePrismaError(err, res, next) {
  if (err && err.code === "P2002") {
    return res.status(400).json({ success: false, error: "Record already exists" });
  }
  return next(err);
}

const charRouter = express.Router();

charRouter.get("/", async (req, res, next) => {
  try {
    const { projectId, status, gender, race, search } = req.query;
    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });

    const where = { projectId };
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (race) where.race = race;

    let characters = await prisma.character.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    if (search && search.trim()) {
      const needle = search.trim().toLowerCase();
      characters = characters.filter((character) => {
        return [
          character.name,
          character.alias,
          character.personality,
          character.background,
          character.occupation,
          character.goal,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    res.json({ success: true, data: characters.map(toCharacterDto) });
  } catch (err) {
    next(err);
  }
});

charRouter.post("/", async (req, res, next) => {
  try {
    const data = buildCharacterData(req.body, true);
    if (!data.projectId) return res.status(400).json({ success: false, error: "projectId is required" });
    if (!data.name) return res.status(400).json({ success: false, error: "name is required" });

    const character = await prisma.character.create({ data });
    res.status(201).json({ success: true, data: toCharacterDto(character) });
  } catch (err) {
    handlePrismaError(err, res, next);
  }
});

charRouter.get("/:id", async (req, res, next) => {
  try {
    const character = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!character) return res.status(404).json({ success: false, error: "Character not found" });
    res.json({ success: true, data: toCharacterDto(character) });
  } catch (err) {
    next(err);
  }
});

charRouter.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Character not found" });

    const data = buildCharacterData(req.body, false);
    if (data.name !== undefined && !data.name) {
      return res.status(400).json({ success: false, error: "name is required" });
    }

    const character = await prisma.character.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: toCharacterDto(character) });
  } catch (err) {
    handlePrismaError(err, res, next);
  }
});

charRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.character.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Character not found" });

    await prisma.character.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

const relRouter = express.Router();

relRouter.get("/", async (req, res, next) => {
  try {
    const { projectId, characterId, relationType, sourceCharacterId, targetCharacterId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });

    const where = { projectId };
    if (relationType) where.relationType = relationType;
    if (sourceCharacterId) where.characterAId = sourceCharacterId;
    if (targetCharacterId) where.characterBId = targetCharacterId;
    if (characterId) {
      where.OR = [{ characterAId: characterId }, { characterBId: characterId }];
    }

    const relations = await prisma.characterRelationship.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: relations.map(toRelationDto) });
  } catch (err) {
    next(err);
  }
});

relRouter.post("/", async (req, res, next) => {
  try {
    const projectId = req.body.projectId;
    const characterAId = req.body.sourceCharacterId || req.body.characterAId;
    const characterBId = req.body.targetCharacterId || req.body.characterBId;
    const relationType = req.body.relationType;

    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });
    if (!characterAId) return res.status(400).json({ success: false, error: "sourceCharacterId is required" });
    if (!characterBId) return res.status(400).json({ success: false, error: "targetCharacterId is required" });
    if (!relationType) return res.status(400).json({ success: false, error: "relationType is required" });

    const relation = await prisma.characterRelationship.create({
      data: {
        projectId,
        characterAId,
        characterBId,
        relationType,
        description: req.body.description || "",
      },
    });

    res.status(201).json({ success: true, data: toRelationDto(relation) });
  } catch (err) {
    next(err);
  }
});

relRouter.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.characterRelationship.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Relation not found" });

    const data = {};
    if (req.body.relationType !== undefined) data.relationType = req.body.relationType;
    if (req.body.description !== undefined) data.description = req.body.description || "";

    const relation = await prisma.characterRelationship.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: toRelationDto(relation) });
  } catch (err) {
    next(err);
  }
});

relRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.characterRelationship.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Relation not found" });

    await prisma.characterRelationship.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = { charRouter, relRouter };
