/* ================================================================
   Outline Router — REST API for Outline Board (Prisma-backed)
   /api/outline/stories · /api/outline/volumes · /api/outline/chapters · /api/outline/scenes

   MIGRATED: MemoryStorageAdapter → Prisma (SQLite)
   Story = Project (同一顶层实体)
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");

// ═══════════════════════════════════
//  Helpers
// ═══════════════════════════════════

function ok(res, data) { res.json({ success: true, data }); }
function created(res, data) { res.status(201).json({ success: true, data }); }
function fail(res, code, msg) { res.status(code).json({ success: false, error: msg }); }

/** 状态值映射：outline 中文 ↔ Prisma 英文 */
const STATUS_TO_PRISMA = { "未开始": "draft", "写作中": "writing", "完成": "completed" };
const STATUS_FROM_PRISMA = { "draft": "未开始", "writing": "写作中", "completed": "完成" };

function statusToPrisma(s) { return STATUS_TO_PRISMA[s] || s || "draft"; }
function statusFromPrisma(s) { return STATUS_FROM_PRISMA[s] || s || "未开始"; }

/** 将 Scene 的 JSON 数组字段 parse 为真正的数组 */
function sceneToDto(sc) {
  if (!sc) return null;
  const parseArr = (field) => {
    try { const v = JSON.parse(field || "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  return {
    ...sc,
    characterIds: parseArr(sc.characterIds),
    locationIds: parseArr(sc.locationIds),
    factionIds: parseArr(sc.factionIds),
    tags: parseArr(sc.tags),
    status: statusFromPrisma(sc.status),
    createdAt: sc.createdAt?.toISOString?.() ?? sc.createdAt,
    updatedAt: sc.updatedAt?.toISOString?.() ?? sc.updatedAt,
  };
}

function chapterToDto(ch) {
  if (!ch) return null;
  return {
    ...ch,
    status: statusFromPrisma(ch.status),
    createdAt: ch.createdAt?.toISOString?.() ?? ch.createdAt,
    updatedAt: ch.updatedAt?.toISOString?.() ?? ch.updatedAt,
  };
}

function volumeToDto(vol) {
  if (!vol) return null;
  return {
    ...vol,
    status: statusFromPrisma(vol.status),
    createdAt: vol.createdAt?.toISOString?.() ?? vol.createdAt,
    updatedAt: vol.updatedAt?.toISOString?.() ?? vol.updatedAt,
  };
}

/** 将 Project 包装为 Story DTO（前端 Outline Board 期望的 Story 格式） */
function projectToStoryDto(project) {
  if (!project) return null;
  return {
    id: project.id,
    projectId: project.id,
    title: project.name,
    description: project.description || "",
    theme: project.theme || "",
    genre: project.genre || "其他",
    createdAt: project.createdAt?.toISOString?.() ?? project.createdAt,
    updatedAt: project.updatedAt?.toISOString?.() ?? project.updatedAt,
  };
}

/** 序列化数组字段为 JSON 字符串 */
function packArrayField(arr) {
  if (!arr || !Array.isArray(arr)) return "[]";
  return JSON.stringify(arr);
}

/** 计算下一个 order 值 */
async function nextOrder(model, where) {
  const max = await model.findFirst({ where, orderBy: { order: "desc" }, select: { order: true } });
  return (max?.order ?? -1) + 1;
}

/** 重新排序：将 item 移到 newOrder 位置，同级所有 item 重新编号 */
async function reorderItems(model, where, itemId, newOrder, newParentField, newParentId) {
  const items = await model.findMany({ where, orderBy: { order: "asc" } });

  const targetIdx = items.findIndex(i => i.id === itemId);
  if (targetIdx === -1) return null;

  const [target] = items.splice(targetIdx, 1);

  // 更新 parent（如果指定了 newParentId）
  const updateData = { order: Math.min(newOrder, items.length) };
  if (newParentField && newParentId) {
    updateData[newParentField] = newParentId;
  }

  // 重新插入
  items.splice(Math.min(newOrder, items.length), 0, target);

  // 批量更新所有 order 值
  for (let i = 0; i < items.length; i++) {
    await model.update({ where: { id: items[i].id }, data: { order: i } });
  }

  // 更新目标 item
  await model.update({ where: { id: itemId }, data: updateData });

  return await model.findUnique({ where: { id: itemId } });
}

// ═══════════════════════════════════
//  Stories (≡ Projects)
// ═══════════════════════════════════

// GET /api/outline/stories?projectId=
router.get("/stories", async (req, res, next) => {
  try {
    const projectId = req.query.projectId || "";
    if (!projectId) {
      // 无 projectId 时返回项目列表（包装为 Story）
      const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
      return ok(res, projects.map(projectToStoryDto));
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return ok(res, []);
    ok(res, [projectToStoryDto(project)]);
  } catch (err) { next(err); }
});

// POST /api/outline/stories
router.post("/stories", async (req, res, next) => {
  try {
    const { projectId, title, description, theme, genre } = req.body;
    if (!projectId || !projectId.trim()) return fail(res, 400, "projectId is required");
    if (!title || !title.trim()) return fail(res, 400, "title is required");

    const project = await prisma.project.update({
      where: { id: projectId.trim() },
      data: {
        name: title.trim(),
        description: description?.trim?.() ?? "",
        theme: theme?.trim?.() ?? "",
        genre: genre ?? "其他",
      },
    });
    created(res, projectToStoryDto(project));
  } catch (err) { next(err); }
});

// GET /api/outline/stories/:id
router.get("/stories/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return fail(res, 404, "故事不存在");
    ok(res, projectToStoryDto(project));
  } catch (err) { next(err); }
});

// PUT /api/outline/stories/:id
router.put("/stories/:id", async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "故事不存在");

    const data = {};
    if (req.body.title !== undefined) data.name = req.body.title.trim();
    if (req.body.description !== undefined) data.description = req.body.description?.trim?.() ?? "";
    if (req.body.theme !== undefined) data.theme = req.body.theme?.trim?.() ?? "";
    if (req.body.genre !== undefined) data.genre = req.body.genre;

    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    ok(res, projectToStoryDto(project));
  } catch (err) { next(err); }
});

// DELETE /api/outline/stories/:id — 不允许通过此路由删除项目
router.delete("/stories/:id", async (req, res, next) => {
  return fail(res, 400, "请通过项目管理删除项目");
});

// ═══════════════════════════════════
//  Tree & Stats
// ═══════════════════════════════════

// GET /api/outline/stories/:id/tree
router.get("/stories/:id/tree", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return fail(res, 404, "项目不存在");

    // 一次性查询所有数据
    const [volumes, chapters, scenes] = await Promise.all([
      prisma.volume.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.chapter.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
    ]);

    const story = projectToStoryDto(project);
    const volumeNodes = volumes.map(vol => {
      const volDto = volumeToDto(vol);
      const chs = chapters
        .filter(c => c.volumeId === vol.id)
        .map(ch => ({
          ...chapterToDto(ch),
          scenes: scenes
            .filter(s => s.chapterId === ch.id)
            .map(sceneToDto),
        }));
      return { volume: volDto, chapters: chs };
    });

    ok(res, { story, volumes: volumeNodes });
  } catch (err) { next(err); }
});

// GET /api/outline/stories/:id/stats
router.get("/stories/:id/stats", async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const [project, volCount, chCount, scCount] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.volume.count({ where: { projectId } }),
      prisma.chapter.count({ where: { projectId } }),
      prisma.scene.count({ where: { projectId } }),
    ]);
    if (!project) return fail(res, 404, "项目不存在");

    const chapters = await prisma.chapter.findMany({ where: { projectId }, select: { status: true } });
    const completedChapters = chapters.filter(c => c.status === "completed" || c.status === "完成").length;
    const writingChapters = chapters.filter(c => c.status === "writing" || c.status === "写作中").length;
    const draftChapters = chapters.filter(c => c.status === "draft" || c.status === "未开始").length;

    ok(res, {
      volumes: volCount,
      chapters: chCount,
      scenes: scCount,
      completedChapters,
      writingChapters,
      draftChapters,
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════
//  Volumes
// ═══════════════════════════════════

// GET /api/outline/volumes?storyId=
router.get("/volumes", async (req, res, next) => {
  try {
    const projectId = req.query.storyId || req.query.projectId || "";
    const volumes = await prisma.volume.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
    ok(res, volumes.map(volumeToDto));
  } catch (err) { next(err); }
});

// POST /api/outline/volumes
router.post("/volumes", async (req, res, next) => {
  try {
    const projectId = req.body.storyId || req.body.projectId;
    if (!projectId) return fail(res, 400, "storyId is required");
    if (!req.body.title || !req.body.title.trim()) return fail(res, 400, "title is required");

    const order = req.body.order ?? await nextOrder(prisma.volume, { projectId });
    const volume = await prisma.volume.create({
      data: {
        projectId,
        title: req.body.title.trim(),
        summary: req.body.description?.trim?.() ?? "",
        order,
      },
    });
    created(res, volumeToDto(volume));
  } catch (err) { next(err); }
});

// GET /api/outline/volumes/:id
router.get("/volumes/:id", async (req, res, next) => {
  try {
    const vol = await prisma.volume.findUnique({ where: { id: req.params.id } });
    if (!vol) return fail(res, 404, "卷不存在");
    ok(res, volumeToDto(vol));
  } catch (err) { next(err); }
});

// PUT /api/outline/volumes/:id
router.put("/volumes/:id", async (req, res, next) => {
  try {
    const existing = await prisma.volume.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "卷不存在");

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.description !== undefined) data.summary = req.body.description?.trim?.() ?? "";
    if (req.body.order !== undefined) data.order = parseInt(req.body.order) || 0;

    const vol = await prisma.volume.update({ where: { id: req.params.id }, data });
    ok(res, volumeToDto(vol));
  } catch (err) { next(err); }
});

// DELETE /api/outline/volumes/:id
router.delete("/volumes/:id", async (req, res, next) => {
  try {
    const existing = await prisma.volume.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "卷不存在");

    // Prisma onDelete: Cascade 会自动删除关联的 Chapter 和 Scene
    await prisma.volume.delete({ where: { id: req.params.id } });
    ok(res, null);
  } catch (err) { next(err); }
});

// POST /api/outline/volumes/:id/reorder
router.post("/volumes/:id/reorder", async (req, res, next) => {
  try {
    const vol = await prisma.volume.findUnique({ where: { id: req.params.id } });
    if (!vol) return fail(res, 404, "卷不存在");

    const result = await reorderItems(
      prisma.volume, { projectId: vol.projectId },
      req.params.id, parseInt(req.body.newOrder) || 0
    );
    if (!result) return fail(res, 404, "排序失败");
    ok(res, volumeToDto(result));
  } catch (err) { next(err); }
});

// ═══════════════════════════════════
//  Chapters
// ═══════════════════════════════════

// GET /api/outline/chapters?volumeId=&status=
router.get("/chapters", async (req, res, next) => {
  try {
    const where = {};
    if (req.query.volumeId) where.volumeId = req.query.volumeId;
    if (req.query.status) where.status = statusToPrisma(req.query.status);

    const chapters = await prisma.chapter.findMany({
      where,
      orderBy: { order: "asc" },
    });
    ok(res, chapters.map(chapterToDto));
  } catch (err) { next(err); }
});

// POST /api/outline/chapters
router.post("/chapters", async (req, res, next) => {
  try {
    const { volumeId, title, summary, goal, order, status } = req.body;
    if (!volumeId) return fail(res, 400, "volumeId is required");
    if (!title || !title.trim()) return fail(res, 400, "title is required");

    // 获取 volume 以拿到 projectId
    const vol = await prisma.volume.findUnique({ where: { id: volumeId } });
    if (!vol) return fail(res, 400, "卷不存在");

    const chOrder = order ?? await nextOrder(prisma.chapter, { volumeId });
    const chapter = await prisma.chapter.create({
      data: {
        projectId: vol.projectId,
        volumeId,
        title: title.trim(),
        summary: summary?.trim?.() ?? "",
        goal: goal?.trim?.() ?? "",
        order: chOrder,
        status: statusToPrisma(status),
      },
    });
    created(res, chapterToDto(chapter));
  } catch (err) { next(err); }
});

// GET /api/outline/chapters/:id
router.get("/chapters/:id", async (req, res, next) => {
  try {
    const ch = await prisma.chapter.findUnique({ where: { id: req.params.id } });
    if (!ch) return fail(res, 404, "章节不存在");
    ok(res, chapterToDto(ch));
  } catch (err) { next(err); }
});

// PUT /api/outline/chapters/:id
router.put("/chapters/:id", async (req, res, next) => {
  try {
    const existing = await prisma.chapter.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "章节不存在");

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.summary !== undefined) data.summary = req.body.summary?.trim?.() ?? "";
    if (req.body.goal !== undefined) data.goal = req.body.goal?.trim?.() ?? "";
    if (req.body.order !== undefined) data.order = parseInt(req.body.order) || 0;
    if (req.body.status !== undefined) data.status = statusToPrisma(req.body.status);
    if (req.body.content !== undefined) data.content = req.body.content;
    if (req.body.wordCount !== undefined) data.wordCount = parseInt(req.body.wordCount) || 0;

    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: { ...data, updatedAt: new Date() },
    });
    ok(res, chapterToDto(chapter));
  } catch (err) { next(err); }
});

// DELETE /api/outline/chapters/:id
router.delete("/chapters/:id", async (req, res, next) => {
  try {
    const existing = await prisma.chapter.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "章节不存在");

    // Prisma onDelete: Cascade 会自动删除关联 Scene
    await prisma.chapter.delete({ where: { id: req.params.id } });
    ok(res, null);
  } catch (err) { next(err); }
});

// POST /api/outline/chapters/:id/reorder
router.post("/chapters/:id/reorder", async (req, res, next) => {
  try {
    const ch = await prisma.chapter.findUnique({ where: { id: req.params.id } });
    if (!ch) return fail(res, 404, "章节不存在");

    const targetVolId = req.body.newParentId || ch.volumeId;
    const result = await reorderItems(
      prisma.chapter,
      { volumeId: targetVolId },
      req.params.id,
      parseInt(req.body.newOrder) || 0,
      "volumeId",
      targetVolId
    );
    if (!result) return fail(res, 404, "排序失败");
    ok(res, chapterToDto(result));
  } catch (err) { next(err); }
});

// ═══════════════════════════════════
//  Scenes
// ═══════════════════════════════════

// GET /api/outline/scenes?chapterId=
router.get("/scenes", async (req, res, next) => {
  try {
    const where = {};
    if (req.query.chapterId) where.chapterId = req.query.chapterId;
    const scenes = await prisma.scene.findMany({ where, orderBy: { order: "asc" } });
    ok(res, scenes.map(sceneToDto));
  } catch (err) { next(err); }
});

// POST /api/outline/scenes
router.post("/scenes", async (req, res, next) => {
  try {
    const { chapterId, title, goal, conflict, result, summary, characterIds, locationIds, factionIds, tags, order } = req.body;
    if (!chapterId) return fail(res, 400, "chapterId is required");
    if (!title || !title.trim()) return fail(res, 400, "title is required");

    // 获取 chapter 以拿到 projectId
    const ch = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!ch) return fail(res, 400, "章节不存在");

    const scOrder = order ?? await nextOrder(prisma.scene, { chapterId });
    const scene = await prisma.scene.create({
      data: {
        projectId: ch.projectId,
        chapterId,
        title: title.trim(),
        summary: summary?.trim?.() ?? "",
        goal: goal?.trim?.() ?? "",
        conflict: conflict?.trim?.() ?? "",
        result: result?.trim?.() ?? "",
        characterIds: packArrayField(characterIds),
        locationIds: packArrayField(locationIds),
        factionIds: packArrayField(factionIds),
        tags: packArrayField(tags),
        order: scOrder,
      },
    });
    created(res, sceneToDto(scene));
  } catch (err) { next(err); }
});

// GET /api/outline/scenes/:id
router.get("/scenes/:id", async (req, res, next) => {
  try {
    const sc = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!sc) return fail(res, 404, "场景不存在");
    ok(res, sceneToDto(sc));
  } catch (err) { next(err); }
});

// PUT /api/outline/scenes/:id
router.put("/scenes/:id", async (req, res, next) => {
  try {
    const existing = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "场景不存在");

    const data = {};
    if (req.body.title !== undefined) data.title = req.body.title.trim();
    if (req.body.summary !== undefined) data.summary = req.body.summary?.trim?.() ?? "";
    if (req.body.goal !== undefined) data.goal = req.body.goal?.trim?.() ?? "";
    if (req.body.conflict !== undefined) data.conflict = req.body.conflict?.trim?.() ?? "";
    if (req.body.result !== undefined) data.result = req.body.result?.trim?.() ?? "";
    if (req.body.characterIds !== undefined) data.characterIds = packArrayField(req.body.characterIds);
    if (req.body.locationIds !== undefined) data.locationIds = packArrayField(req.body.locationIds);
    if (req.body.factionIds !== undefined) data.factionIds = packArrayField(req.body.factionIds);
    if (req.body.tags !== undefined) data.tags = packArrayField(req.body.tags);
    if (req.body.order !== undefined) data.order = parseInt(req.body.order) || 0;
    data.updatedAt = new Date();

    const scene = await prisma.scene.update({ where: { id: req.params.id }, data });
    ok(res, sceneToDto(scene));
  } catch (err) { next(err); }
});

// DELETE /api/outline/scenes/:id
router.delete("/scenes/:id", async (req, res, next) => {
  try {
    const existing = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, "场景不存在");
    await prisma.scene.delete({ where: { id: req.params.id } });
    ok(res, null);
  } catch (err) { next(err); }
});

// POST /api/outline/scenes/:id/reorder
router.post("/scenes/:id/reorder", async (req, res, next) => {
  try {
    const sc = await prisma.scene.findUnique({ where: { id: req.params.id } });
    if (!sc) return fail(res, 404, "场景不存在");

    const targetChId = req.body.newParentId || sc.chapterId;
    const result = await reorderItems(
      prisma.scene,
      { chapterId: targetChId },
      req.params.id,
      parseInt(req.body.newOrder) || 0,
      "chapterId",
      targetChId
    );
    if (!result) return fail(res, 404, "排序失败");
    ok(res, sceneToDto(result));
  } catch (err) { next(err); }
});

module.exports = router;
