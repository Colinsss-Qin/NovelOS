const express = require("express");
const { prisma } = require("../lib/prisma");
const { buildChapterContext } = require("../skills/context-skill/assembler");
const { getProvider, missingKeyMessage } = require("../skills/ai-skill");

const router = express.Router();
const COPILOT_PROMPT = `你是作者的创作副驾驶。你的任务是讨论、分析、检查和提供备选方案。尊重作者的最终决定。除非用户明确要求，否则不要直接生成完整章节，不要假装某个建议已经写入正文或故事圣经。指出记忆冲突，但不要自行覆盖。`;
const VALID_ROLES = new Set(["user", "assistant", "system"]);

function fail(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function projectExists(projectId) {
  return prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
}

async function sessionForProject(id, projectId) {
  return prisma.chatSession.findFirst({ where: { id, projectId } });
}

router.get("/sessions", async (req, res, next) => {
  try {
    const projectId = cleanText(req.query.projectId, 100);
    if (!projectId) return fail(res, 400, "缺少 projectId");
    const sessions = await prisma.chatSession.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, projectId: true, chapterId: true, title: true, provider: true, model: true, createdAt: true, updatedAt: true },
    });
    res.json({ success: true, data: sessions });
  } catch (error) { next(error); }
});

router.post("/sessions", async (req, res, next) => {
  try {
    const projectId = cleanText(req.body && req.body.projectId, 100);
    const chapterId = cleanText(req.body && req.body.chapterId, 100) || null;
    if (!projectId || !(await projectExists(projectId))) return fail(res, 404, "项目不存在");
    if (chapterId) {
      const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId }, select: { id: true } });
      if (!chapter) return fail(res, 400, "章节不属于当前项目");
    }
    const provider = getProvider();
    const session = await prisma.chatSession.create({ data: {
      projectId, chapterId, title: cleanText(req.body && req.body.title, 80) || "新对话",
      provider: provider.name, model: provider.model,
    } });
    res.status(201).json({ success: true, data: session });
  } catch (error) { next(error); }
});

router.get("/sessions/:id", async (req, res, next) => {
  try {
    const projectId = cleanText(req.query.projectId, 100);
    if (!projectId) return fail(res, 400, "缺少 projectId");
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, projectId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!session) return fail(res, 404, "对话不存在或不属于当前项目");
    res.json({ success: true, data: session });
  } catch (error) { next(error); }
});

router.delete("/sessions/:id", async (req, res, next) => {
  try {
    const projectId = cleanText(req.query.projectId, 100);
    const session = await sessionForProject(req.params.id, projectId);
    if (!session) return fail(res, 404, "对话不存在或不属于当前项目");
    await prisma.chatSession.delete({ where: { id: session.id } });
    res.json({ success: true, data: { id: session.id } });
  } catch (error) { next(error); }
});

router.get("/memories", async (req, res, next) => {
  try {
    const projectId = cleanText(req.query.projectId, 100);
    if (!projectId) return fail(res, 400, "缺少 projectId");
    const memories = await prisma.projectMemory.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" } });
    res.json({ success: true, data: memories });
  } catch (error) { next(error); }
});

router.post("/memories", async (req, res, next) => {
  try {
    const projectId = cleanText(req.body && req.body.projectId, 100);
    const title = cleanText(req.body && req.body.title, 120);
    const content = cleanText(req.body && req.body.content, 8000);
    const sourceMessageId = cleanText(req.body && req.body.sourceMessageId, 100) || null;
    if (!projectId || !(await projectExists(projectId))) return fail(res, 404, "项目不存在");
    if (!title || !content) return fail(res, 400, "记忆标题和内容不能为空");
    if (sourceMessageId) {
      const source = await prisma.chatMessage.findFirst({ where: { id: sourceMessageId, session: { projectId } }, select: { id: true } });
      if (!source) return fail(res, 400, "来源消息不属于当前项目");
    }
    const memory = await prisma.projectMemory.create({ data: {
      projectId, title, content, sourceMessageId,
      category: cleanText(req.body && req.body.category, 60) || "其他", status: "active",
    } });
    res.status(201).json({ success: true, data: memory });
  } catch (error) { next(error); }
});

router.put("/memories/:id", async (req, res, next) => {
  try {
    const projectId = cleanText(req.body && req.body.projectId, 100);
    const existing = await prisma.projectMemory.findFirst({ where: { id: req.params.id, projectId } });
    if (!existing) return fail(res, 404, "记忆不存在或不属于当前项目");
    const title = cleanText(req.body && req.body.title, 120);
    const content = cleanText(req.body && req.body.content, 8000);
    if (!title || !content) return fail(res, 400, "记忆标题和内容不能为空");
    const memory = await prisma.projectMemory.update({ where: { id: existing.id }, data: {
      title, content, category: cleanText(req.body.category, 60) || "其他",
      status: req.body.status === "archived" ? "archived" : "active",
    } });
    res.json({ success: true, data: memory });
  } catch (error) { next(error); }
});

router.delete("/memories/:id", async (req, res, next) => {
  try {
    const projectId = cleanText(req.query.projectId, 100);
    const existing = await prisma.projectMemory.findFirst({ where: { id: req.params.id, projectId } });
    if (!existing) return fail(res, 404, "记忆不存在或不属于当前项目");
    await prisma.projectMemory.delete({ where: { id: existing.id } });
    res.json({ success: true, data: { id: existing.id } });
  } catch (error) { next(error); }
});

async function assembleMessages({ projectId, chapterId, selectedText, chapterContent, history }) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true, genre: true, description: true, theme: true } });
  if (!project) throw Object.assign(new Error("项目不存在"), { status: 404, expose: true });
  const memories = await prisma.projectMemory.findMany({ where: { projectId, status: "active" }, orderBy: { updatedAt: "desc" }, take: 30 });
  const used = { project: project.name, chapter: null, selectedText: !!selectedText, memories: memories.map((m) => m.title), contextItems: null };
  const blocks = [`【当前项目】${project.name}｜${project.genre || "未分类"}`, project.description ? `【项目简介】${project.description.slice(0, 1000)}` : "", project.theme ? `【主题】${project.theme.slice(0, 500)}` : ""];
  if (chapterId) {
    const ctx = await buildChapterContext(chapterId, projectId);
    blocks.push(ctx.contextBlock.slice(0, 7000));
    used.contextItems = ctx.usedItems;
    const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId }, select: { title: true } });
    used.chapter = chapter && chapter.title;
  }
  if (selectedText) blocks.push(`【作者当前选中的正文】\n${selectedText.slice(0, 5000)}`);
  else if (chapterContent) blocks.push(`【当前正文相关片段/结尾】\n${chapterContent.slice(-5000)}`);
  if (memories.length) blocks.push("【作者确认的长期记忆】\n" + memories.map((m) => `- [${m.category}] ${m.title}: ${m.content.slice(0, 800)}`).join("\n"));
  const safeHistory = history.filter((m) => VALID_ROLES.has(m.role) && m.role !== "system").slice(-16).map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  return { messages: [{ role: "system", content: COPILOT_PROMPT + "\n\n" + blocks.filter(Boolean).join("\n\n") }, ...safeHistory], used };
}

router.post("/stream", async (req, res, next) => {
  let assistantContent = "";
  try {
    const projectId = cleanText(req.body && req.body.projectId, 100);
    const sessionId = cleanText(req.body && req.body.sessionId, 100);
    const chapterId = cleanText(req.body && req.body.chapterId, 100) || null;
    const content = cleanText(req.body && req.body.content, 12000);
    if (!projectId || !sessionId || !content) return fail(res, 400, "项目、对话和消息内容不能为空");
    const session = await sessionForProject(sessionId, projectId);
    if (!session) return fail(res, 404, "对话不存在或不属于当前项目");
    if (chapterId) {
      const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, projectId }, select: { id: true } });
      if (!chapter) return fail(res, 400, "章节不属于当前项目");
    }
    const provider = getProvider(session.provider);
    if (!provider.apiKey) return fail(res, 400, missingKeyMessage());
    await prisma.chatMessage.create({ data: { sessionId, role: "user", content } });
    const stored = await prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" }, take: 40 });
    const assembled = await assembleMessages({ projectId, chapterId, selectedText: cleanText(req.body.selectedText, 5000), chapterContent: cleanText(req.body.chapterContent, 30000), history: stored });
    const controller = new AbortController();
    req.on("aborted", () => controller.abort());
    res.on("close", () => { if (!res.writableEnded) controller.abort(); });
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`data: ${JSON.stringify({ context: assembled.used })}\n\n`);
    for await (const token of provider.generateStream({ messages: assembled.messages, maxTokens: 4096, temperature: 0.6, signal: controller.signal })) {
      assistantContent += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
    if (assistantContent.trim()) {
      const message = await prisma.chatMessage.create({ data: { sessionId, role: "assistant", content: assistantContent } });
      const data = { chapterId, updatedAt: new Date() };
      if (session.title === "新对话") data.title = content.slice(0, 30);
      await prisma.chatSession.update({ where: { id: sessionId }, data });
      res.write(`data: ${JSON.stringify({ done: true, messageId: message.id })}\n\n`);
    } else res.write(`data: ${JSON.stringify({ error: "AI 没有返回内容" })}\n\n`);
    res.end();
  } catch (error) {
    if (!res.headersSent) return next(error);
    if (error.name !== "AbortError") res.write(`data: ${JSON.stringify({ error: error.message || "AI 对话失败" })}\n\n`);
    if (!res.writableEnded) res.end();
  }
});

module.exports = router;
