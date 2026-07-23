const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { prisma } = require("../lib/prisma");
const { buildChapterContext } = require("../skills/context-skill/assembler");
const studioChatRouter = require("./studio-chat-router");

async function fixture() {
  const suffix = Date.now() + "-" + Math.random().toString(16).slice(2);
  const a = await prisma.project.create({ data: { name: "chat-test-a-" + suffix, genre: "test" } });
  const b = await prisma.project.create({ data: { name: "chat-test-b-" + suffix, genre: "test" } });
  const chapter = await prisma.chapter.create({ data: { projectId: a.id, title: "测试章节", order: 0, content: "原始正文" } });
  return { a, b, chapter };
}

async function cleanup(ids) {
  await prisma.project.deleteMany({ where: { id: { in: ids } } });
}

test("project memories stay isolated", async () => {
  const f = await fixture();
  try {
    await prisma.projectMemory.createMany({ data: [
      { projectId: f.a.id, title: "A记忆", content: "只属于A" },
      { projectId: f.b.id, title: "B记忆", content: "只属于B" },
    ] });
    const memories = await prisma.projectMemory.findMany({ where: { projectId: f.a.id } });
    assert.deepEqual(memories.map((m) => m.title), ["A记忆"]);
  } finally { await cleanup([f.a.id, f.b.id]); }
});

test("sessions and messages persist with their project", async () => {
  const f = await fixture();
  try {
    const session = await prisma.chatSession.create({ data: { projectId: f.a.id, chapterId: f.chapter.id, title: "持久化", provider: "deepseek", model: "test" } });
    await prisma.chatMessage.createMany({ data: [
      { sessionId: session.id, role: "user", content: "第一轮" },
      { sessionId: session.id, role: "assistant", content: "回答" },
    ] });
    const loaded = await prisma.chatSession.findFirst({ where: { id: session.id, projectId: f.a.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    assert.equal(loaded.messages.length, 2);
    assert.equal(await prisma.chatSession.findFirst({ where: { id: session.id, projectId: f.b.id } }), null);
  } finally { await cleanup([f.a.id, f.b.id]); }
});

test("chapter context rejects a chapter from another project", async () => {
  const f = await fixture();
  try {
    await assert.rejects(() => buildChapterContext(f.chapter.id, f.b.id));
    const context = await buildChapterContext(f.chapter.id, f.a.id);
    assert.ok(context.contextBlock.includes("测试章节"));
  } finally { await cleanup([f.a.id, f.b.id]); }
});

test("assistant text insertion requires confirmation and never auto-saves", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "public/modules/studio-assistant/index.js"), "utf8");
  const insertion = source.slice(source.indexOf("function insertText"), source.indexOf("function loadProjectData"));
  assert.match(insertion, /NovelOSModal\.confirm/);
  assert.doesNotMatch(insertion, /saveChapter/);
});

test("assistant retries initialization instead of silently dropping send", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "public/modules/studio-assistant/index.js"), "utf8");
  const sendSource = source.slice(source.indexOf("function send()"), source.indexOf("function stop()"));
  assert.match(sendSource, /AI 对话尚未初始化，正在重试/);
  assert.match(sendSource, /loadProjectData\(\)\.then/);
  assert.doesNotMatch(sendSource, /!state\.session \|\| state\.controller\) return/);
});

test("chat infrastructure errors identify missing schema and stale Prisma Client", () => {
  const missingTable = studioChatRouter.classifyInfrastructureError(new Error("SQLite error: no such table: ChatSession"));
  assert.equal(missingTable.code, "CHAT_DB_SCHEMA_MISSING");
  const staleClient = studioChatRouter.classifyInfrastructureError(new Error("Cannot read properties of undefined (reading 'chatSession')"));
  assert.equal(staleClient.code, "CHAT_PRISMA_CLIENT_OUTDATED");
});

test.after(async () => { await prisma.$disconnect(); });
