// ================================================================
// Outline Skill — 类型定义（严格模式，零 any）
// Story → Volume → Chapter → Scene 四层树结构
// ================================================================

// ── 枚举 ──

export const CHAPTER_STATUSES = ["未开始", "写作中", "完成"] as const;
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];

export const STORY_GENRES = [
  "奇幻", "科幻", "武侠", "都市", "历史", "悬疑", "言情", "恐怖", "其他",
] as const;
export type StoryGenre = (typeof STORY_GENRES)[number];

// ── Story（顶层） ──

export interface Story {
  readonly id: string;
  projectId: string;
  title: string;
  description: string;
  theme: string;
  genre: StoryGenre;
  readonly createdAt: string;
  updatedAt: string;
}

// ── Volume（卷） ──

export interface Volume {
  readonly id: string;
  storyId: string;
  title: string;
  description: string;
  order: number;
  readonly createdAt: string;
  updatedAt: string;
}

// ── Chapter（章） ──

export interface Chapter {
  readonly id: string;
  volumeId: string;
  title: string;
  summary: string;
  goal: string;
  order: number;
  status: ChapterStatus;
  readonly createdAt: string;
  updatedAt: string;
}

// ── Scene（场景/情节点） ──

export interface Scene {
  readonly id: string;
  chapterId: string;
  title: string;
  goal: string;
  conflict: string;
  result: string;
  summary: string;
  characterIds: readonly string[];   // → Character Skill
  locationIds: readonly string[];    // → World Skill (Location)
  factionIds: readonly string[];     // → World Skill (Faction)
  tags: readonly string[];
  order: number;
  readonly createdAt: string;
  updatedAt: string;
}

// ── 输入类型 ──

export interface CreateStoryInput {
  projectId: string;
  title: string;
  description?: string;
  theme?: string;
  genre?: StoryGenre;
}

export interface UpdateStoryInput {
  title?: string;
  description?: string;
  theme?: string;
  genre?: StoryGenre;
}

export interface CreateVolumeInput {
  storyId: string;
  title: string;
  description?: string;
  order?: number;
}

export interface UpdateVolumeInput {
  title?: string;
  description?: string;
  order?: number;
}

export interface CreateChapterInput {
  volumeId: string;
  title: string;
  summary?: string;
  goal?: string;
  order?: number;
  status?: ChapterStatus;
}

export interface UpdateChapterInput {
  title?: string;
  summary?: string;
  goal?: string;
  order?: number;
  status?: ChapterStatus;
}

export interface CreateSceneInput {
  chapterId: string;
  title: string;
  goal?: string;
  conflict?: string;
  result?: string;
  summary?: string;
  characterIds?: string[];
  locationIds?: string[];
  factionIds?: string[];
  tags?: string[];
  order?: number;
}

export interface UpdateSceneInput {
  title?: string;
  goal?: string;
  conflict?: string;
  result?: string;
  summary?: string;
  characterIds?: string[];
  locationIds?: string[];
  factionIds?: string[];
  tags?: string[];
  order?: number;
}

// ── 排序输入 ──

export interface ReorderInput {
  id: string;
  newOrder: number;
  /** 如果移动到不同父节点，指定目标父节点 ID */
  newParentId?: string;
}

// ── 查询过滤 ──

export interface VolumeFilter {
  storyId: string;
}

export interface ChapterFilter {
  volumeId: string;
  status?: ChapterStatus;
}

export interface SceneFilter {
  chapterId: string;
}

// ── 树结构 ──

export interface ChapterTreeNode {
  volume: Volume;
  chapters: (Chapter & { scenes: Scene[] })[];
}

export interface StoryTreeNode {
  story: Story;
  volumes: ChapterTreeNode[];
}

// ── 操作结果 ──

export type OutlineResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── 持久化适配器 ──

export interface OutlineStorageAdapter {
  loadStories(): Story[];
  saveStories(stories: readonly Story[]): void;
  loadVolumes(): Volume[];
  saveVolumes(volumes: readonly Volume[]): void;
  loadChapters(): Chapter[];
  saveChapters(chapters: readonly Chapter[]): void;
  loadScenes(): Scene[];
  saveScenes(scenes: readonly Scene[]): void;
}

export type IdGenerator = () => string;
