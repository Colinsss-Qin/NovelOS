/* ================================================================
   Outline Router — REST API for Outline Skill
   /api/outline/stories · /api/outline/volumes · /api/outline/chapters · /api/outline/scenes
   ================================================================ */

const express = require("express");
const {
  createStory, updateStory, deleteStory, getStory, listStories,
  createVolume, updateVolume, deleteVolume, getVolume, listVolumes, reorderVolume,
  createChapter, updateChapter, deleteChapter, getChapter, listChapters, reorderChapter,
  createScene, updateScene, deleteScene, getScene, listScenes, reorderScene,
  buildStoryTree, getStoryStats,
} = require("../../dist/outline-skill/index");

const router = express.Router();

function ok(res, r) { if (r.success) res.json(r); else res.status(400).json(r); }
function created(res, r) { if (r.success) res.status(201).json(r); else res.status(400).json(r); }
function notFound(res, r) { if (r.success) res.json(r); else res.status(404).json(r); }

// ── Stories ──
router.get("/stories", (req, res) => ok(res, listStories(req.query.projectId || "proj_demo")));
router.post("/stories", (req, res) => created(res, createStory(req.body)));
router.get("/stories/:id", (req, res) => notFound(res, getStory(req.params.id)));
router.put("/stories/:id", (req, res) => ok(res, updateStory(req.params.id, req.body)));
router.delete("/stories/:id", (req, res) => ok(res, deleteStory(req.params.id)));

// ── Tree ──
router.get("/stories/:id/tree", (req, res) => {
  const tree = buildStoryTree(req.params.id);
  if (!tree) return res.status(404).json({ success: false, error: "Story not found" });
  res.json({ success: true, data: tree });
});
router.get("/stories/:id/stats", (req, res) => ok(res, { success: true, data: getStoryStats(req.params.id) }));

// ── Volumes ──
router.get("/volumes", (req, res) => ok(res, listVolumes({ storyId: req.query.storyId || "" })));
router.post("/volumes", (req, res) => created(res, createVolume(req.body)));
router.get("/volumes/:id", (req, res) => notFound(res, getVolume(req.params.id)));
router.put("/volumes/:id", (req, res) => ok(res, updateVolume(req.params.id, req.body)));
router.delete("/volumes/:id", (req, res) => ok(res, deleteVolume(req.params.id)));
router.post("/volumes/:id/reorder", (req, res) => ok(res, reorderVolume({ id: req.params.id, ...req.body })));

// ── Chapters ──
router.get("/chapters", (req, res) => ok(res, listChapters({ volumeId: req.query.volumeId || "", status: req.query.status })));
router.post("/chapters", (req, res) => created(res, createChapter(req.body)));
router.get("/chapters/:id", (req, res) => notFound(res, getChapter(req.params.id)));
router.put("/chapters/:id", (req, res) => ok(res, updateChapter(req.params.id, req.body)));
router.delete("/chapters/:id", (req, res) => ok(res, deleteChapter(req.params.id)));
router.post("/chapters/:id/reorder", (req, res) => ok(res, reorderChapter({ id: req.params.id, ...req.body })));

// ── Scenes ──
router.get("/scenes", (req, res) => ok(res, listScenes({ chapterId: req.query.chapterId || "" })));
router.post("/scenes", (req, res) => created(res, createScene(req.body)));
router.get("/scenes/:id", (req, res) => notFound(res, getScene(req.params.id)));
router.put("/scenes/:id", (req, res) => ok(res, updateScene(req.params.id, req.body)));
router.delete("/scenes/:id", (req, res) => ok(res, deleteScene(req.params.id)));
router.post("/scenes/:id/reorder", (req, res) => ok(res, reorderScene({ id: req.params.id, ...req.body })));

module.exports = router;
