/* ================================================================
   Future Scene Router — /api/future-scenes
   Prisma-direct pattern (same as knowledge-base & war-room)
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");

// ── Helpers ──

function _parseTargets(fs) {
  const result = { ...fs };
  result.targetCharacters = fs.targetCharacters ? JSON.parse(fs.targetCharacters) : [];
  result.targetLocations  = fs.targetLocations  ? JSON.parse(fs.targetLocations)  : [];
  result.targetFactions   = fs.targetFactions   ? JSON.parse(fs.targetFactions)   : [];
  return result;
}

function _serializeTargets(data) {
  const d = { ...data };
  if (d.targetCharacters !== undefined) d.targetCharacters = JSON.stringify(d.targetCharacters);
  if (d.targetLocations  !== undefined) d.targetLocations  = JSON.stringify(d.targetLocations);
  if (d.targetFactions   !== undefined) d.targetFactions   = JSON.stringify(d.targetFactions);
  return d;
}

// ── GET /entity-names (MUST be before /:id) ──

router.get("/entity-names", async (req, res, next) => {
  try {
    const { characterIds, locationIds, factionIds, chapterIds } = req.query;
    const charIds = characterIds ? characterIds.split(",").filter(Boolean) : [];
    const locIds  = locationIds  ? locationIds.split(",").filter(Boolean)  : [];
    const facIds  = factionIds   ? factionIds.split(",").filter(Boolean)   : [];
    const chIds   = chapterIds   ? chapterIds.split(",").filter(Boolean)    : [];

    const [characters, locations, factions, chapters] = await Promise.all([
      charIds.length ? prisma.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true } }) : [],
      locIds.length  ? prisma.location.findMany({ where: { id: { in: locIds } }, select: { id: true, name: true } })   : [],
      facIds.length  ? prisma.faction.findMany({ where: { id: { in: facIds } }, select: { id: true, name: true } })    : [],
      chIds.length   ? prisma.chapter.findMany({ where: { id: { in: chIds } }, select: { id: true, title: true } })     : [],
    ]);

    const toMap = (list, field) => {
      const map = {};
      list.forEach(item => { map[item.id] = item[field]; });
      return map;
    };

    res.json({
      success: true,
      data: {
        characters: toMap(characters, "name"),
        locations:  toMap(locations, "name"),
        factions:   toMap(factions, "name"),
        chapters:   toMap(chapters, "title"),
      }
    });
  } catch (err) { next(err); }
});

// ── GET /timeline (MUST be before /:id) ──

router.get("/timeline", async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const scenes = await prisma.futureScene.findMany({
      where: { projectId, expectedChapterId: { not: null } },
      include: {
        expectedChapter: {
          include: { volume: true }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    // Sort client-side: by volume.order then chapter.order, null chapters last
    const sorted = scenes.map(s => {
      const parsed = _parseTargets(s);
      return { ...parsed, expectedChapter: s.expectedChapter };
    }).sort((a, b) => {
      const aCh = a.expectedChapter;
      const bCh = b.expectedChapter;
      if (!aCh && !bCh) return 0;
      if (!aCh) return 1;
      if (!bCh) return -1;
      const aVolOrder = aCh.volume?.order ?? 0;
      const bVolOrder = bCh.volume?.order ?? 0;
      if (aVolOrder !== bVolOrder) return aVolOrder - bVolOrder;
      return (aCh.order ?? 0) - (bCh.order ?? 0);
    });

    res.json({ success: true, data: sorted });
  } catch (err) { next(err); }
});

// ── GET / — list with filters ──

router.get("/", async (req, res, next) => {
  try {
    const { projectId, status, sceneType, importance, query, sortBy, sortOrder, limit, offset } = req.query;
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    const where = { projectId };
    if (status)     where.status     = status;
    if (sceneType)  where.sceneType  = sceneType;
    if (importance) where.importance = importance;

    const orderField = sortBy || "updatedAt";
    const orderDir   = sortOrder === "asc" ? "asc" : "desc";
    const take       = Math.min(parseInt(limit) || 50, 200);
    const skip       = parseInt(offset) || 0;

    let scenes = await prisma.futureScene.findMany({
      where,
      include: { expectedChapter: { select: { id: true, title: true, order: true } } },
      orderBy: { [orderField]: orderDir },
      take,
      skip,
    });

    // Client-side text search
    if (query) {
      const q = query.toLowerCase();
      scenes = scenes.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.summary || "").toLowerCase().includes(q) ||
        (s.emotionGoal || "").toLowerCase().includes(q) ||
        (s.triggerConditions || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q) ||
        (s.tags || "").toLowerCase().includes(q)
      );
    }

    const total = await prisma.futureScene.count({ where });

    res.json({
      success: true,
      data: {
        items: scenes.map(_parseTargets),
        total,
        limit: take,
        offset: skip,
      }
    });
  } catch (err) { next(err); }
});

// ── POST / — create ──

router.post("/", async (req, res, next) => {
  try {
    const { projectId, title, summary, emotionGoal, sceneType, importance, status,
            triggerConditions, prerequisiteEvents, targetCharacters, targetLocations,
            targetFactions, expectedChapterId, notes, tags } = req.body;

    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });
    if (!title)    return res.status(400).json({ success: false, error: "title is required" });

    const data = _serializeTargets({
      projectId, title,
      summary:            summary || null,
      emotionGoal:        emotionGoal || null,
      sceneType:          sceneType || null,
      importance:         importance || "medium",
      status:             status || "构思中",
      triggerConditions:  triggerConditions || null,
      prerequisiteEvents: prerequisiteEvents || null,
      targetCharacters:   targetCharacters || null,
      targetLocations:    targetLocations || null,
      targetFactions:     targetFactions || null,
      expectedChapterId:  expectedChapterId || null,
      notes:              notes || null,
      tags:               tags || null,
    });

    const scene = await prisma.futureScene.create({ data });
    res.status(201).json({ success: true, data: _parseTargets(scene) });
  } catch (err) { next(err); }
});

// ── GET /:id — get one ──

router.get("/:id", async (req, res, next) => {
  try {
    const scene = await prisma.futureScene.findUnique({
      where: { id: req.params.id },
      include: { expectedChapter: { select: { id: true, title: true, order: true } } },
    });
    if (!scene) return res.status(404).json({ success: false, error: "未来场景不存在" });
    res.json({ success: true, data: _parseTargets(scene) });
  } catch (err) { next(err); }
});

// ── PATCH /:id — partial update ──

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.futureScene.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "未来场景不存在" });

    const { title, summary, emotionGoal, sceneType, importance, status,
            triggerConditions, prerequisiteEvents, targetCharacters, targetLocations,
            targetFactions, expectedChapterId, notes, tags } = req.body;

    const data = { updatedAt: new Date() };
    if (title              !== undefined) data.title              = title;
    if (summary            !== undefined) data.summary            = summary;
    if (emotionGoal        !== undefined) data.emotionGoal        = emotionGoal;
    if (sceneType          !== undefined) data.sceneType          = sceneType;
    if (importance         !== undefined) data.importance         = importance;
    if (status             !== undefined) data.status             = status;
    if (triggerConditions  !== undefined) data.triggerConditions  = triggerConditions;
    if (prerequisiteEvents !== undefined) data.prerequisiteEvents = prerequisiteEvents;
    if (targetCharacters   !== undefined) data.targetCharacters   = JSON.stringify(targetCharacters);
    if (targetLocations    !== undefined) data.targetLocations    = JSON.stringify(targetLocations);
    if (targetFactions     !== undefined) data.targetFactions     = JSON.stringify(targetFactions);
    if (expectedChapterId  !== undefined) data.expectedChapterId  = expectedChapterId;
    if (notes              !== undefined) data.notes              = notes;
    if (tags               !== undefined) data.tags               = tags;

    const scene = await prisma.futureScene.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: _parseTargets(scene) });
  } catch (err) { next(err); }
});

// ── PATCH /:id/status — quick status change (drag-and-drop) ──

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: "status is required" });

    const existing = await prisma.futureScene.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "未来场景不存在" });

    const scene = await prisma.futureScene.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
    });
    res.json({ success: true, data: _parseTargets(scene) });
  } catch (err) { next(err); }
});

// ── DELETE /:id ──

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.futureScene.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "未来场景不存在" });

    await prisma.futureScene.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

module.exports = router;
