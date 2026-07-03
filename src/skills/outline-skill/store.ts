// ================================================================
// Outline Skill — Zustand Store（严格类型，零 any）
// Story → Volume → Chapter → Scene + reorder + cascade
// ================================================================

import { create } from "zustand";
import type {
  Story, Volume, Chapter, Scene,
  CreateStoryInput, UpdateStoryInput,
  CreateVolumeInput, UpdateVolumeInput,
  CreateChapterInput, UpdateChapterInput,
  CreateSceneInput, UpdateSceneInput,
  ReorderInput,
  VolumeFilter, ChapterFilter, SceneFilter,
  OutlineResult, OutlineStorageAdapter, IdGenerator,
} from "./types";
import {
  validateCreateStory, validateUpdateStory,
  validateCreateVolume, validateUpdateVolume,
  validateCreateChapter, validateUpdateChapter,
  validateCreateScene, validateUpdateScene,
} from "./validation";

const defaultIdGenerator: IdGenerator = () =>
  "ol_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

class MemoryStorageAdapter implements OutlineStorageAdapter {
  private s: Story[] = []; private v: Volume[] = []; private c: Chapter[] = []; private sc: Scene[] = [];
  loadStories() { return this.s; } saveStories(d: readonly Story[]) { this.s = [...d]; }
  loadVolumes() { return this.v; } saveVolumes(d: readonly Volume[]) { this.v = [...d]; }
  loadChapters() { return this.c; } saveChapters(d: readonly Chapter[]) { this.c = [...d]; }
  loadScenes() { return this.sc; } saveScenes(d: readonly Scene[]) { this.sc = [...d]; }
}

// ── helpers ──

function now() { return new Date().toISOString(); }

function nextOrder<T extends { order: number }>(items: T[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map(i => i.order)) + 1;
}

function reorderList<T extends { id: string; order: number }>(
  list: T[], id: string, newOrder: number
): T[] {
  const idx = list.findIndex(i => i.id === id);
  if (idx === -1) return list;
  const item = { ...list[idx], order: newOrder };
  const rest = list.filter(i => i.id !== id);
  // Insert and re-normalize
  rest.splice(newOrder, 0, item);
  return rest.map((it, i) => ({ ...it, order: i }));
}

// ── Store ──

interface OutlineState {
  stories: Record<string, Story>;
  volumes: Record<string, Volume>;
  chapters: Record<string, Chapter>;
  scenes: Record<string, Scene>;
  idGenerator: IdGenerator;
  storage: OutlineStorageAdapter;
}

interface OutlineActions {
  setStorage: (a: OutlineStorageAdapter) => void;
  loadFromStorage: () => void;

  // Story
  createStory: (i: CreateStoryInput) => OutlineResult<Story>;
  updateStory: (id: string, i: UpdateStoryInput) => OutlineResult<Story>;
  deleteStory: (id: string) => OutlineResult<null>;
  getStory: (id: string) => OutlineResult<Story>;
  listStories: (projectId: string) => OutlineResult<Story[]>;

  // Volume
  createVolume: (i: CreateVolumeInput) => OutlineResult<Volume>;
  updateVolume: (id: string, i: UpdateVolumeInput) => OutlineResult<Volume>;
  deleteVolume: (id: string) => OutlineResult<null>;
  getVolume: (id: string) => OutlineResult<Volume>;
  listVolumes: (f: VolumeFilter) => OutlineResult<Volume[]>;
  reorderVolume: (i: ReorderInput) => OutlineResult<Volume>;

  // Chapter
  createChapter: (i: CreateChapterInput) => OutlineResult<Chapter>;
  updateChapter: (id: string, i: UpdateChapterInput) => OutlineResult<Chapter>;
  deleteChapter: (id: string) => OutlineResult<null>;
  getChapter: (id: string) => OutlineResult<Chapter>;
  listChapters: (f: ChapterFilter) => OutlineResult<Chapter[]>;
  reorderChapter: (i: ReorderInput) => OutlineResult<Chapter>;

  // Scene
  createScene: (i: CreateSceneInput) => OutlineResult<Scene>;
  updateScene: (id: string, i: UpdateSceneInput) => OutlineResult<Scene>;
  deleteScene: (id: string) => OutlineResult<null>;
  getScene: (id: string) => OutlineResult<Scene>;
  listScenes: (f: SceneFilter) => OutlineResult<Scene[]>;
  reorderScene: (i: ReorderInput) => OutlineResult<Scene>;
}

type OutlineStore = OutlineState & OutlineActions;

// ═══════════════════════════════════════
//  Store
// ═══════════════════════════════════════

export const useOutlineStore = create<OutlineStore>()((set, get) => ({
  stories: {}, volumes: {}, chapters: {}, scenes: {},
  idGenerator: defaultIdGenerator,
  storage: new MemoryStorageAdapter(),

  setStorage: (a) => set({ storage: a }),
  loadFromStorage: () => {
    const s = get().storage;
    set({
      stories: Object.fromEntries(s.loadStories().map(x => [x.id, x])),
      volumes: Object.fromEntries(s.loadVolumes().map(x => [x.id, x])),
      chapters: Object.fromEntries(s.loadChapters().map(x => [x.id, x])),
      scenes: Object.fromEntries(s.loadScenes().map(x => [x.id, x])),
    });
  },

  // ── Story ──

  createStory: (input) => {
    const errs = validateCreateStory(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const id = get().idGenerator();
    const story: Story = {
      id, projectId: input.projectId.trim(), title: input.title.trim(),
      description: input.description?.trim() ?? "", theme: input.theme?.trim() ?? "",
      genre: input.genre ?? "其他", createdAt: now(), updatedAt: now(),
    };
    set(s => ({ stories: { ...s.stories, [id]: story } }));
    get().storage.saveStories(Object.values(get().stories));
    return { success: true, data: story };
  },

  updateStory: (id, input) => {
    const ex = get().stories[id];
    if (!ex) return { success: false, error: `故事不存在: ${id}` };
    const errs = validateUpdateStory(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Story = {
      ...ex, title: input.title?.trim() ?? ex.title,
      description: input.description?.trim() ?? ex.description,
      theme: input.theme?.trim() ?? ex.theme, genre: input.genre ?? ex.genre,
      updatedAt: now(),
    };
    set(s => ({ stories: { ...s.stories, [id]: updated } }));
    get().storage.saveStories(Object.values(get().stories));
    return { success: true, data: updated };
  },

  deleteStory: (id) => {
    if (!get().stories[id]) return { success: false, error: `故事不存在: ${id}` };
    // Cascade: delete all volumes, chapters, scenes under this story
    const volIds = Object.values(get().volumes).filter(v => v.storyId === id).map(v => v.id);
    const chIds = Object.values(get().chapters).filter(c => volIds.includes(c.volumeId)).map(c => c.id);
    const { [id]: _, ...restS } = get().stories;
    const restV: Record<string, Volume> = {};
    for (const [k, v] of Object.entries(get().volumes)) { if (!volIds.includes(k)) restV[k] = v; }
    const restC: Record<string, Chapter> = {};
    for (const [k, v] of Object.entries(get().chapters)) { if (!chIds.includes(k) && !volIds.includes(v.volumeId)) restC[k] = v; }
    const restSc: Record<string, Scene> = {};
    for (const [k, v] of Object.entries(get().scenes)) { if (!chIds.includes(v.chapterId)) restSc[k] = v; }
    set({ stories: restS, volumes: restV, chapters: restC, scenes: restSc });
    const s = get().storage;
    s.saveStories(Object.values(get().stories)); s.saveVolumes(Object.values(get().volumes));
    s.saveChapters(Object.values(get().chapters)); s.saveScenes(Object.values(get().scenes));
    return { success: true, data: null };
  },

  getStory: (id) => { const s = get().stories[id]; return s ? { success: true, data: s } : { success: false, error: `故事不存在: ${id}` }; },
  listStories: (projectId) => {
    const list = Object.values(get().stories).filter(s => s.projectId === projectId);
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { success: true, data: list };
  },

  // ── Volume ──

  createVolume: (input) => {
    const errs = validateCreateVolume(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    if (!get().stories[input.storyId]) return { success: false, error: `故事不存在: ${input.storyId}` };
    const id = get().idGenerator();
    const siblings = Object.values(get().volumes).filter(v => v.storyId === input.storyId);
    const order = input.order ?? nextOrder(siblings);
    const v: Volume = {
      id, storyId: input.storyId, title: input.title.trim(),
      description: input.description?.trim() ?? "", order, createdAt: now(), updatedAt: now(),
    };
    set(s => ({ volumes: { ...s.volumes, [id]: v } }));
    get().storage.saveVolumes(Object.values(get().volumes));
    return { success: true, data: v };
  },

  updateVolume: (id, input) => {
    const ex = get().volumes[id];
    if (!ex) return { success: false, error: `卷不存在: ${id}` };
    const errs = validateUpdateVolume(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Volume = {
      ...ex, title: input.title?.trim() ?? ex.title,
      description: input.description?.trim() ?? ex.description,
      order: input.order ?? ex.order, updatedAt: now(),
    };
    set(s => ({ volumes: { ...s.volumes, [id]: updated } }));
    get().storage.saveVolumes(Object.values(get().volumes));
    return { success: true, data: updated };
  },

  deleteVolume: (id) => {
    if (!get().volumes[id]) return { success: false, error: `卷不存在: ${id}` };
    const chIds = Object.values(get().chapters).filter(c => c.volumeId === id).map(c => c.id);
    const { [id]: _, ...restV } = get().volumes;
    const restC: Record<string, Chapter> = {};
    for (const [k, v] of Object.entries(get().chapters)) { if (!chIds.includes(k)) restC[k] = v; }
    const restSc: Record<string, Scene> = {};
    for (const [k, v] of Object.entries(get().scenes)) { if (!chIds.includes(v.chapterId)) restSc[k] = v; }
    set({ volumes: restV, chapters: restC, scenes: restSc });
    const s = get().storage; s.saveVolumes(Object.values(get().volumes));
    s.saveChapters(Object.values(get().chapters)); s.saveScenes(Object.values(get().scenes));
    return { success: true, data: null };
  },

  getVolume: (id) => { const v = get().volumes[id]; return v ? { success: true, data: v } : { success: false, error: `卷不存在: ${id}` }; },
  listVolumes: (f) => {
    const list = Object.values(get().volumes).filter(v => v.storyId === f.storyId).sort((a, b) => a.order - b.order);
    return { success: true, data: list };
  },

  reorderVolume: (input) => {
    const ex = get().volumes[input.id];
    if (!ex) return { success: false, error: `卷不存在: ${input.id}` };
    const siblings = Object.values(get().volumes).filter(v => v.storyId === ex.storyId && v.id !== input.id);
    const reordered = reorderList([ex, ...siblings], input.id, input.newOrder);
    const updates: Record<string, Volume> = { ...get().volumes };
    reordered.forEach(v => { updates[v.id] = { ...updates[v.id], order: v.order, updatedAt: now() }; });
    set({ volumes: updates });
    get().storage.saveVolumes(Object.values(get().volumes));
    return { success: true, data: updates[input.id] };
  },

  // ── Chapter ──

  createChapter: (input) => {
    const errs = validateCreateChapter(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    if (!get().volumes[input.volumeId]) return { success: false, error: `卷不存在: ${input.volumeId}` };
    const id = get().idGenerator();
    const siblings = Object.values(get().chapters).filter(c => c.volumeId === input.volumeId);
    const order = input.order ?? nextOrder(siblings);
    const ch: Chapter = {
      id, volumeId: input.volumeId, title: input.title.trim(),
      summary: input.summary?.trim() ?? "", goal: input.goal?.trim() ?? "",
      order, status: input.status ?? "未开始", createdAt: now(), updatedAt: now(),
    };
    set(s => ({ chapters: { ...s.chapters, [id]: ch } }));
    get().storage.saveChapters(Object.values(get().chapters));
    return { success: true, data: ch };
  },

  updateChapter: (id, input) => {
    const ex = get().chapters[id];
    if (!ex) return { success: false, error: `章不存在: ${id}` };
    const errs = validateUpdateChapter(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Chapter = {
      ...ex, title: input.title?.trim() ?? ex.title,
      summary: input.summary?.trim() ?? ex.summary,
      goal: input.goal?.trim() ?? ex.goal, order: input.order ?? ex.order,
      status: input.status ?? ex.status, updatedAt: now(),
    };
    set(s => ({ chapters: { ...s.chapters, [id]: updated } }));
    get().storage.saveChapters(Object.values(get().chapters));
    return { success: true, data: updated };
  },

  deleteChapter: (id) => {
    if (!get().chapters[id]) return { success: false, error: `章不存在: ${id}` };
    const scIds = Object.values(get().scenes).filter(sc => sc.chapterId === id).map(sc => sc.id);
    const { [id]: _, ...restC } = get().chapters;
    const restSc: Record<string, Scene> = {};
    for (const [k, v] of Object.entries(get().scenes)) { if (!scIds.includes(k)) restSc[k] = v; }
    set({ chapters: restC, scenes: restSc });
    get().storage.saveChapters(Object.values(get().chapters));
    get().storage.saveScenes(Object.values(get().scenes));
    return { success: true, data: null };
  },

  getChapter: (id) => { const c = get().chapters[id]; return c ? { success: true, data: c } : { success: false, error: `章不存在: ${id}` }; },
  listChapters: (f) => {
    let list = Object.values(get().chapters).filter(c => c.volumeId === f.volumeId);
    if (f.status) list = list.filter(c => c.status === f.status);
    list.sort((a, b) => a.order - b.order);
    return { success: true, data: list };
  },

  reorderChapter: (input) => {
    const ex = get().chapters[input.id];
    if (!ex) return { success: false, error: `章不存在: ${input.id}` };
    let targetVolId = input.newParentId ?? ex.volumeId;
    const siblings = Object.values(get().chapters).filter(c => c.volumeId === targetVolId && c.id !== input.id);
    const updated = { ...ex, volumeId: targetVolId };
    const reordered = reorderList([updated, ...siblings], input.id, input.newOrder);
    const updates: Record<string, Chapter> = { ...get().chapters };
    reordered.forEach(c => { updates[c.id] = { ...updates[c.id], order: c.order, volumeId: c.volumeId, updatedAt: now() }; });
    set({ chapters: updates });
    get().storage.saveChapters(Object.values(get().chapters));
    return { success: true, data: updates[input.id] };
  },

  // ── Scene ──

  createScene: (input) => {
    const errs = validateCreateScene(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    if (!get().chapters[input.chapterId]) return { success: false, error: `章不存在: ${input.chapterId}` };
    const id = get().idGenerator();
    const siblings = Object.values(get().scenes).filter(s => s.chapterId === input.chapterId);
    const order = input.order ?? nextOrder(siblings);
    const sc: Scene = {
      id, chapterId: input.chapterId, title: input.title.trim(),
      goal: input.goal?.trim() ?? "", conflict: input.conflict?.trim() ?? "",
      result: input.result?.trim() ?? "", summary: input.summary?.trim() ?? "",
      characterIds: Object.freeze([...(input.characterIds ?? [])]),
      locationIds: Object.freeze([...(input.locationIds ?? [])]),
      factionIds: Object.freeze([...(input.factionIds ?? [])]),
      tags: Object.freeze([...(input.tags ?? [])]),
      order, createdAt: now(), updatedAt: now(),
    };
    set(s => ({ scenes: { ...s.scenes, [id]: sc } }));
    get().storage.saveScenes(Object.values(get().scenes));
    return { success: true, data: sc };
  },

  updateScene: (id, input) => {
    const ex = get().scenes[id];
    if (!ex) return { success: false, error: `场景不存在: ${id}` };
    const errs = validateUpdateScene(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Scene = {
      ...ex, title: input.title?.trim() ?? ex.title,
      goal: input.goal?.trim() ?? ex.goal, conflict: input.conflict?.trim() ?? ex.conflict,
      result: input.result?.trim() ?? ex.result, summary: input.summary?.trim() ?? ex.summary,
      characterIds: input.characterIds !== undefined ? Object.freeze([...input.characterIds]) : ex.characterIds,
      locationIds: input.locationIds !== undefined ? Object.freeze([...input.locationIds]) : ex.locationIds,
      factionIds: input.factionIds !== undefined ? Object.freeze([...input.factionIds]) : ex.factionIds,
      tags: input.tags !== undefined ? Object.freeze([...input.tags]) : ex.tags,
      order: input.order ?? ex.order, updatedAt: now(),
    };
    set(s => ({ scenes: { ...s.scenes, [id]: updated } }));
    get().storage.saveScenes(Object.values(get().scenes));
    return { success: true, data: updated };
  },

  deleteScene: (id) => {
    if (!get().scenes[id]) return { success: false, error: `场景不存在: ${id}` };
    const { [id]: _, ...rest } = get().scenes;
    set({ scenes: rest });
    get().storage.saveScenes(Object.values(get().scenes));
    return { success: true, data: null };
  },

  getScene: (id) => { const s = get().scenes[id]; return s ? { success: true, data: s } : { success: false, error: `场景不存在: ${id}` }; },
  listScenes: (f) => {
    const list = Object.values(get().scenes).filter(s => s.chapterId === f.chapterId).sort((a, b) => a.order - b.order);
    return { success: true, data: list };
  },

  reorderScene: (input) => {
    const ex = get().scenes[input.id];
    if (!ex) return { success: false, error: `场景不存在: ${input.id}` };
    let targetChId = input.newParentId ?? ex.chapterId;
    const siblings = Object.values(get().scenes).filter(s => s.chapterId === targetChId && s.id !== input.id);
    const updated = { ...ex, chapterId: targetChId };
    const reordered = reorderList([updated, ...siblings], input.id, input.newOrder);
    const updates: Record<string, Scene> = { ...get().scenes };
    reordered.forEach(s => { updates[s.id] = { ...updates[s.id], order: s.order, chapterId: s.chapterId, updatedAt: now() }; });
    set({ scenes: updates });
    get().storage.saveScenes(Object.values(get().scenes));
    return { success: true, data: updates[input.id] };
  },
}));
