/* ================================================================
   War Room Module — Writing workspace API (Prisma-backed)
   Project / Volume / Chapter management + scene planning
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../../lib/prisma");

// ═══════════════════════════════════════════
//  Projects
// ═══════════════════════════════════════════

// GET /api/projects
router.get("/", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { chapters: true, characters: true } } },
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post("/", async (req, res, next) => {
  try {
    const { name, genre, description, targetWords } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "name is required" });
    }
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        genre: genre || "未分类",
        description: description || "",
        targetWords: parseInt(targetWords) || 0,
      },
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { volumes: true, chapters: true, characters: true, scenes: true } } },
    });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/dashboard — War Room dashboard data
router.get("/:id/dashboard", async (req, res, next) => {
  try {
    const projectId = req.params.id;

    // Fetch all data in parallel
    const [project, volumes, chapters, futureScenes, unifiedCount, totalWords] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.volume.findMany({ where: { projectId }, orderBy: { order: "asc" }, select: { id: true, title: true, status: true, order: true } }),
      prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" }, select: { id: true, title: true, status: true, volumeId: true, wordCount: true, order: true, updatedAt: true } }),
      prisma.futureScene.findMany({ where: { projectId }, select: { id: true, status: true } }),
      prisma.unifiedItem.count({ where: { projectId } }),
      prisma.chapter.aggregate({ where: { projectId }, _sum: { wordCount: true } }),
    ]);

    if (!project) return res.status(404).json({ success: false, error: "Project not found" });

    // Progress: count finalized vs total chapters
    const totalChapters = chapters.length;
    const finalizedChapters = chapters.filter(c => c.status === "finalized" || c.status === "completed").length;

    // Current volume: first volume that has unfinished chapters
    let currentVolume = null;
    let currentChapter = null;
    for (const vol of volumes) {
      const volChapters = chapters.filter(c => c.volumeId === vol.id && c.status !== "finalized" && c.status !== "completed");
      if (volChapters.length > 0) {
        currentVolume = { id: vol.id, title: vol.title };
        // Most recently updated unfinished chapter
        volChapters.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        currentChapter = { id: volChapters[0].id, title: volChapters[0].title };
        break;
      }
    }
    // Fallback: first volume + first chapter
    if (!currentVolume && volumes.length > 0) {
      currentVolume = { id: volumes[0].id, title: volumes[0].title };
      const firstCh = chapters.filter(c => c.volumeId === volumes[0].id)[0];
      if (firstCh) currentChapter = { id: firstCh.id, title: firstCh.title };
    }

    // Outline nodes: volumes + chapters + scenes
    const sceneCount = chapters.reduce((sum, c) => sum, 0); // We'll count separately
    // Actually let's just count volumes + chapters, and get scenes count
    const volumesCount = volumes.length;

    // Future Scene stats by status
    const fsStats = { "构思中": 0, "规划中": 0, "推进中": 0, "已完成": 0, "废弃": 0 };
    futureScenes.forEach(fs => {
      if (fsStats.hasOwnProperty(fs.status)) fsStats[fs.status]++;
    });

    res.json({
      success: true,
      data: {
        project: { id: project.id, name: project.name, genre: project.genre },
        progress: {
          totalChapters,
          finalizedChapters,
          percent: totalChapters > 0 ? Math.round((finalizedChapters / totalChapters) * 100) : 0,
        },
        currentVolume,
        currentChapter,
        stats: {
          bibleEntries: unifiedCount,
          outlineNodes: { volumes: volumesCount, chapters: totalChapters }, // scenes counted separately
          futureScenes: { total: futureScenes.length, ...fsStats },
          totalWords: totalWords._sum.wordCount || 0,
        },
      }
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
//  Volumes
// ═══════════════════════════════════════════

// GET /api/projects/:id/volumes
router.get("/:id/volumes", async (req, res, next) => {
  try {
    const volumes = await prisma.volume.findMany({
      where: { projectId: req.params.id },
      orderBy: { order: "asc" },
      include: {
        chapters: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true, status: true, wordCount: true } },
      },
    });
    res.json({ success: true, data: volumes });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/volumes
router.post("/:id/volumes", async (req, res, next) => {
  try {
    const { title, summary, order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    // Auto-increment order if not specified
    let volOrder = parseInt(order) || 0;
    if (!order) {
      const max = await prisma.volume.findFirst({
        where: { projectId: req.params.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      volOrder = (max?.order ?? -1) + 1;
    }

    const volume = await prisma.volume.create({
      data: {
        projectId: req.params.id,
        title: title.trim(),
        summary: summary || "",
        order: volOrder,
      },
    });
    res.status(201).json({ success: true, data: volume });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
//  Chapters
// ═══════════════════════════════════════════

// GET /api/projects/:id/chapters/:chapterId — get chapter with full content
router.get("/:id/chapters/:chapterId", async (req, res, next) => {
  try {
    const chapter = await prisma.chapter.findFirst({
      where: { id: req.params.chapterId, projectId: req.params.id },
      include: { scenes: { orderBy: { order: "asc" } } },
    });
    if (!chapter) return res.status(404).json({ success: false, error: "Chapter not found" });
    res.json({ success: true, data: chapter });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id/chapters/:chapterId — save chapter content + metadata
router.put("/:id/chapters/:chapterId", async (req, res, next) => {
  try {
    const { title, content, summary, wordCount, status, order } = req.body;
    const data = { updatedAt: new Date() };
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (summary !== undefined) data.summary = summary;
    if (wordCount !== undefined) data.wordCount = parseInt(wordCount) || 0;
    if (status !== undefined) data.status = status;
    if (order !== undefined) data.order = parseInt(order) || 0;

    const chapter = await prisma.chapter.updateMany({
      where: { id: req.params.chapterId, projectId: req.params.id },
      data,
    });

    if (chapter.count === 0) {
      return res.status(404).json({ success: false, error: "Chapter not found" });
    }

    const updated = await prisma.chapter.findUnique({ where: { id: req.params.chapterId } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/volumes/:volumeId/chapters — create chapter in a volume
router.post("/:id/volumes/:volumeId/chapters", async (req, res, next) => {
  try {
    const { title, summary, content, order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    // Auto-increment order
    let chOrder = parseInt(order) || 0;
    if (!order) {
      const max = await prisma.chapter.findFirst({
        where: { volumeId: req.params.volumeId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      chOrder = (max?.order ?? -1) + 1;
    }

    const chapter = await prisma.chapter.create({
      data: {
        projectId: req.params.id,
        volumeId: req.params.volumeId,
        title: title.trim(),
        summary: summary || "",
        content: content || "",
        order: chOrder,
        wordCount: content ? content.replace(/\s/g, "").length : 0,
      },
    });
    res.status(201).json({ success: true, data: chapter });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
//  Scenes
// ═══════════════════════════════════════════

// GET /api/projects/:id/chapters/:chapterId/scenes
router.get("/:id/chapters/:chapterId/scenes", async (req, res, next) => {
  try {
    const scenes = await prisma.scene.findMany({
      where: { chapterId: req.params.chapterId },
      orderBy: { order: "asc" },
    });
    res.json({ success: true, data: scenes });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/chapters/:chapterId/scenes
router.post("/:id/chapters/:chapterId/scenes", async (req, res, next) => {
  try {
    const { title, summary, order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    let sOrder = parseInt(order) || 0;
    if (!order) {
      const max = await prisma.scene.findFirst({
        where: { chapterId: req.params.chapterId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      sOrder = (max?.order ?? -1) + 1;
    }

    const scene = await prisma.scene.create({
      data: {
        projectId: req.params.id,
        chapterId: req.params.chapterId,
        title: title.trim(),
        summary: summary || "",
        order: sOrder,
      },
    });
    res.status(201).json({ success: true, data: scene });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
