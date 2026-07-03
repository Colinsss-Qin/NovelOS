/* ================================================================
   Project Router — Express REST API for Project Skill
   挂载到 /api/projects
   ================================================================ */

const express = require("express");
const router = express.Router();
const {
  createProject,
  updateProject,
  deleteProject,
  archiveProject,
  getProject,
  listProjects,
  setStorageAdapter,
  loadProjects,
} = require("../../dist/project-skill/index");
const { LocalStorageAdapter } = require("../../dist/project-skill/storage");

// 启用持久化（Node.js 18+ 有 global localStorage，旧版本用内存 fallback）
try {
  if (typeof localStorage !== "undefined") {
    setStorageAdapter(new LocalStorageAdapter());
    loadProjects();
    console.log("  Project Skill: localStorage adapter active");
  } else {
    console.log("  Project Skill: using in-memory store (no localStorage in this env)");
  }
} catch (e) {
  console.log("  Project Skill: using in-memory store (" + e.message + ")");
}

// ═══════════════════════════════════════
//  Routes
// ═══════════════════════════════════════

// GET /api/projects — list all (with optional filters)
router.get("/", (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.genre) filter.genre = req.query.genre;
  if (req.query.tag) filter.tag = req.query.tag;
  if (req.query.search) filter.search = req.query.search;

  const result = listProjects(filter);
  if (result.success) {
    res.json({ success: true, data: result.data });
  } else {
    res.status(500).json(result);
  }
});

// POST /api/projects — create
router.post("/", (req, res) => {
  const { title, subtitle, genre, tags, description, cover, targetWords } =
    req.body;

  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "title is required" });
  }

  const result = createProject({
    title,
    subtitle,
    genre,
    tags,
    description,
    cover,
    targetWords,
  });

  if (result.success) {
    res.status(201).json({ success: true, data: result.data });
  } else {
    res.status(400).json(result);
  }
});

// GET /api/projects/:id — get one
router.get("/:id", (req, res) => {
  const result = getProject(req.params.id);
  if (result.success) {
    res.json({ success: true, data: result.data });
  } else {
    res.status(404).json(result);
  }
});

// PUT /api/projects/:id — update
router.put("/:id", (req, res) => {
  const { title, subtitle, genre, tags, description, cover, status, targetWords, currentWords } =
    req.body;

  const result = updateProject(req.params.id, {
    title,
    subtitle,
    genre,
    tags,
    description,
    cover,
    status,
    targetWords,
    currentWords,
  });

  if (result.success) {
    res.json({ success: true, data: result.data });
  } else {
    res.status(result.error.includes("不存在") ? 404 : 400).json(result);
  }
});

// DELETE /api/projects/:id — delete
router.delete("/:id", (req, res) => {
  const result = deleteProject(req.params.id);
  if (result.success) {
    res.json({ success: true, data: null });
  } else {
    res.status(404).json(result);
  }
});

// POST /api/projects/:id/archive — archive
router.post("/:id/archive", (req, res) => {
  const result = archiveProject(req.params.id);
  if (result.success) {
    res.json({ success: true, data: result.data });
  } else {
    res.status(result.error.includes("不存在") ? 404 : 400).json(result);
  }
});

module.exports = router;
