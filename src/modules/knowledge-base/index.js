/* ================================================================
   Knowledge Base Module — REST API for Story Bible items (Prisma-backed)
   ================================================================ */

const express = require("express");
const router = express.Router();
const { prisma } = require("../../lib/prisma");

// ── GET /api/items ── list with optional filters
router.get("/", async (req, res, next) => {
  try {
    const { projectId, type, query, tags, limit, offset } = req.query;
    if (!projectId) {
      return res.status(400).json({ success: false, error: "projectId is required" });
    }

    // Build where clause for Prisma — we store all items in Character table
    // as a flexible key-value store via the tags/notes fields.
    // For V1 simplicity: use Character as the unified item store
    const where = { projectId };
    if (type) where.type = type;

    let items = await prisma.unifiedItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: Math.min(parseInt(limit) || 50, 200),
      skip: parseInt(offset) || 0,
    });

    // Client-side search filtering if query provided
    if (query && query.trim()) {
      const terms = query.trim().toLowerCase().split(/\s+/);
      items = items.filter((item) => {
        const haystack = [item.name, item.summary, item.description, item.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return terms.some((t) => haystack.includes(t));
      });
    }

    // Tag filtering
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(",").map((s) => s.trim());
      items = items.filter((item) => {
        const itemTags = item.tags ? item.tags.split(",").map((s) => s.trim().toLowerCase()) : [];
        return tagList.some((t) => itemTags.includes(t.toLowerCase()));
      });
    }

    // Parse attrsJson -> attrs for each item
    const parsed = items.map((item) => {
      const result = { ...item, attrs: JSON.parse(item.attrsJson || "{}") };
      delete result.attrsJson;
      return result;
    });

    const total = await prisma.unifiedItem.count({ where });

    res.json({
      success: true,
      data: { items: parsed, total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/items ── create
router.post("/", async (req, res, next) => {
  try {
    const { projectId, type, name, summary, description, tags, aliases, attrs } = req.body;

    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });
    if (!type) return res.status(400).json({ success: false, error: "type is required" });
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: "name is required" });

    const item = await prisma.unifiedItem.create({
      data: {
        projectId,
        type,
        name: name.trim(),
        summary: summary || "",
        description: description || "",
        tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
        aliases: Array.isArray(aliases) ? aliases.join(",") : "",
        attrsJson: attrs ? JSON.stringify(attrs) : "{}",
      },
    });

    // Parse attrs back for response
    const result = { ...item, attrs: JSON.parse(item.attrsJson || "{}") };
    delete result.attrsJson;

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/items/tags/list ── get all tags for a project (BEFORE /:id to avoid conflict)
router.get("/tags/list", async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ success: false, error: "projectId is required" });

    const items = await prisma.unifiedItem.findMany({
      where: { projectId },
      select: { tags: true },
    });

    const tagSet = new Set();
    items.forEach((item) => {
      if (item.tags) {
        item.tags.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });

    res.json({ success: true, data: [...tagSet].sort() });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/items/:id ── get one
router.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.unifiedItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: "Not found" });

    const result = { ...item, attrs: JSON.parse(item.attrsJson || "{}") };
    delete result.attrsJson;

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/items/:id ── update
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.unifiedItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });

    const { name, summary, description, tags, aliases, attrs } = req.body;
    const data = { updatedAt: new Date() };
    if (name !== undefined) data.name = name.trim();
    if (summary !== undefined) data.summary = summary;
    if (description !== undefined) data.description = description;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.join(",") : tags;
    if (aliases !== undefined) data.aliases = Array.isArray(aliases) ? aliases.join(",") : aliases;
    if (attrs !== undefined) data.attrsJson = JSON.stringify(attrs);

    const item = await prisma.unifiedItem.update({ where: { id: req.params.id }, data });

    const result = { ...item, attrs: JSON.parse(item.attrsJson || "{}") };
    delete result.attrsJson;

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/items/:id ── delete
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.unifiedItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });

    await prisma.unifiedItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
