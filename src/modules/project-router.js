/* ================================================================
   Project Router - Express REST API for projects (Prisma-backed)
   Mounted at /api/projects
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toProjectDto(project) {
  if (!project) return null;
  return {
    ...project,
    title: project.name,
    subtitle: project.subtitle || "",
    tags: toArray(project.tags),
    cover: project.cover || "",
    status: project.status || "筹备中",
    targetWords: project.targetWords || 0,
    currentWords: project.currentWords || 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function buildProjectData(input, isCreate) {
  const data = {};
  if (input.title !== undefined || input.name !== undefined) {
    data.name = String(input.title ?? input.name).trim();
  }
  if (input.subtitle !== undefined) data.subtitle = input.subtitle || "";
  if (input.genre !== undefined) data.genre = input.genre || "其他";
  if (input.description !== undefined) data.description = input.description || "";
  if (input.tags !== undefined) data.tags = Array.isArray(input.tags) ? input.tags.join(",") : (input.tags || "");
  if (input.cover !== undefined) data.cover = input.cover || "";
  if (input.status !== undefined) data.status = input.status || "筹备中";
  if (input.targetWords !== undefined) data.targetWords = parseInt(input.targetWords, 10) || 0;
  if (input.currentWords !== undefined) data.currentWords = parseInt(input.currentWords, 10) || 0;

  if (isCreate) {
    if (data.genre === undefined) data.genre = "其他";
    if (data.description === undefined) data.description = "";
  }

  return data;
}

router.get("/", async (req, res, next) => {
  try {
    const { status, genre, tag, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (genre) where.genre = genre;

    let projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    if (tag) {
      projects = projects.filter((project) => toArray(project.tags).includes(tag));
    }

    if (search && search.trim()) {
      const needle = search.trim().toLowerCase();
      projects = projects.filter((project) => {
        return [project.name, project.subtitle, project.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    res.json({ success: true, data: projects.map(toProjectDto) });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = buildProjectData(req.body, true);
    if (!data.name) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    const project = await prisma.project.create({ data });
    res.status(201).json({ success: true, data: toProjectDto(project) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    res.json({ success: true, data: toProjectDto(project) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Project not found" });

    const data = buildProjectData(req.body, false);
    if (data.name !== undefined && !data.name) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: toProjectDto(project) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Project not found" });

    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/archive", async (req, res, next) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Project not found" });

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: "归档" },
    });
    res.json({ success: true, data: toProjectDto(project) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
