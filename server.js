const express = require("express");
const path = require("path");
const fs = require("fs");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;

// ── 全局安全头 ──
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ── Body 解析（导入路由需要更大限制），手动包装以捕获解析错误 ──
app.use((req, res, next) => {
  const limit = req.path.startsWith("/api/import/") ? "10mb" : "1mb";
  const jsonMiddleware = express.json({ limit });
  jsonMiddleware(req, res, (err) => {
    if (err) {
      // body-parser JSON 解析失败时返回 JSON 而非 HTML
      if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ success: false, error: "Invalid JSON in request body" });
      }
      if (err.type === "entity.too.large") {
        return res.status(413).json({ success: false, error: "Request body too large (max " + limit + ")" });
      }
      return next(err);
    }
    next();
  });
});

// ── 静态文件服务 ──
app.use(express.static(path.join(__dirname, "public")));

// ═══════════════════════════════════════════
//  API Routes
// ═══════════════════════════════════════════

// AI Skill — /api/generate SSE endpoint
const { handleGenerateRoute } = require("./src/skills/ai-skill");
app.post("/api/generate", handleGenerateRoute);

// Knowledge Base — /api/items (Story Bible CRUD)
const knowledgeBaseRouter = require("./src/modules/knowledge-base");
app.use("/api/items", knowledgeBaseRouter);

// Project Skill — /api/projects (作品 CRUD, Zustand-powered)
const projectRouter = require("./src/modules/project-router");
app.use("/api/projects", projectRouter);

// Character Skill — /api/characters + /api/relations
const { charRouter, relRouter } = require("./src/modules/character-router");
app.use("/api/characters", charRouter);
app.use("/api/relations", relRouter);

// Outline Skill — /api/outline
const outlineRouter = require("./src/modules/outline-router");
app.use("/api/outline", outlineRouter);

// War Room — /api/projects/:id/volumes|chapters|scenes (写作工作区子资源)
const warRoomRouter = require("./src/modules/war-room");
app.use("/api/projects", warRoomRouter);

// Future Scene — /api/future-scenes (未来场景库)
const futureSceneRouter = require("./src/modules/future-scene-router");
app.use("/api/future-scenes", futureSceneRouter);

// Import Assistant — /api/import (文档导入分析 + 批量创建)
const importRouter = require("./src/modules/import-assistant");
app.use("/api/import", importRouter);

// Context — /api/context/chapter (Writing Studio prompt context)
const contextRouter = require("./src/modules/context-router");
app.use("/api/context", contextRouter);

// Writing Studio assistant conversations and project-scoped memories
const studioChatRouter = require("./src/modules/studio-chat-router");
app.use("/api/chat", studioChatRouter);

// ═══════════════════════════════════════════
//  404 — API routes only (static files handled by express.static)
// ═══════════════════════════════════════════
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.path}` });
});

// ═══════════════════════════════════════════
//  Global Error Handler (MUST be last, 4 params)
// ═══════════════════════════════════════════
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status === 500 ? "Internal server error" : err.message);

  // Log to console but never expose stack to client
  if (status === 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);
  }

  res.status(status).json({ success: false, error: message });
});

// ── 启动 ──
app.listen(PORT, () => {
  console.log(`NovelOS server running at http://localhost:${PORT}`);
  console.log(`  POST   /api/generate        — AI 生成 (SSE)`);
  console.log(`  CRUD   /api/items           — 故事圣经`);
  console.log(`  CRUD   /api/projects        — 作品管理 (Project Skill)`);
  console.log(`  SUB    /api/projects/:id/*  — 卷/章/场景`);
  console.log(`  CRUD   /api/future-scenes  — 未来场景库`);
  console.log(`  POST   /api/import/analyze  — 导入助手分析`);
  console.log(`  POST   /api/import/confirm  — 导入助手确认`);
});
