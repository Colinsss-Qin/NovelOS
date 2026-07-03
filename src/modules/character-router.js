/* ================================================================
   Character Router — REST API for Character Skill
   /api/characters — Character CRUD
   /api/relations  — Relation CRUD
   ================================================================ */

const express = require("express");

const {
  createCharacter, updateCharacter, deleteCharacter, getCharacter, listCharacters,
  createRelation, updateRelation, deleteRelation, getRelation, listRelations,
} = require("../../dist/character-skill/index");

// ═══ /api/characters ═══

const charRouter = express.Router();

charRouter.get("/", (req, res) => {
  const { projectId, status, gender, race, search } = req.query;
  if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });
  res.json(listCharacters({ projectId, status, gender, race, search }));
});

charRouter.post("/", (req, res) => {
  const r = createCharacter(req.body);
  r.success ? res.status(201).json(r) : res.status(400).json(r);
});

charRouter.get("/:id", (req, res) => {
  const r = getCharacter(req.params.id);
  r.success ? res.json(r) : res.status(404).json(r);
});

charRouter.put("/:id", (req, res) => {
  const r = updateCharacter(req.params.id, req.body);
  r.success ? res.json(r) : res.status(r.error.includes("不存在") ? 404 : 400).json(r);
});

charRouter.delete("/:id", (req, res) => {
  const r = deleteCharacter(req.params.id);
  r.success ? res.json(r) : res.status(404).json(r);
});

// ═══ /api/relations ═══

const relRouter = express.Router();

relRouter.get("/", (req, res) => {
  const { projectId, characterId, relationType } = req.query;
  if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });
  res.json(listRelations({ projectId, characterId, relationType }));
});

relRouter.post("/", (req, res) => {
  const r = createRelation(req.body);
  r.success ? res.status(201).json(r) : res.status(400).json(r);
});

relRouter.put("/:id", (req, res) => {
  const r = updateRelation(req.params.id, req.body);
  r.success ? res.json(r) : res.status(404).json(r);
});

relRouter.delete("/:id", (req, res) => {
  const r = deleteRelation(req.params.id);
  r.success ? res.json(r) : res.status(404).json(r);
});

module.exports = { charRouter, relRouter };
