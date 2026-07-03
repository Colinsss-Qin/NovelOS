// ================================================================
// Writing Skill — 类型定义（严格模式，零 any）
// 编辑器状态 · 自动保存 · 版本快照 · 字数统计 · 专注模式
// ================================================================

// ── 编辑目标类型 ──

export type EditTargetType = "chapter" | "scene";

export interface EditTarget {
  type: EditTargetType;
  id: string;                    // chapterId or sceneId
  title: string;
  parentTitle: string;           // volume/chapter title for breadcrumb
  content: string;               // current content
  status: string;                // from Outline Skill
  wordCount: number;
}

// ── 编辑器状态 ──

export interface EditorState {
  /** 当前编辑目标（null = 未选择） */
  target: EditTarget | null;

  /** 编辑器内容（与 target.content 同步） */
  content: string;

  /** 是否有未保存的修改 */
  isDirty: boolean;

  /** 最后一次保存时间 */
  lastSavedAt: string | null;

  /** 是否正在保存 */
  isSaving: boolean;

  /** 专注模式 */
  focusMode: boolean;
}

// ── 字数统计 ──

export interface WordStats {
  /** 总字符数（含标点） */
  totalChars: number;

  /** 中文字符数 */
  chineseChars: number;

  /** 英文单词数 */
  englishWords: number;

  /** 段落数 */
  paragraphs: number;

  /** 行数 */
  lines: number;

  /** 估计阅读时间（分钟，中文 500字/分钟） */
  readingTimeMinutes: number;
}

// ── 版本快照 ──

export interface VersionSnapshot {
  readonly id: string;
  readonly editTargetId: string;
  readonly editTargetType: EditTargetType;
  readonly content: string;
  readonly wordCount: number;
  readonly createdAt: string;
  readonly label: string;        // "自动保存" | "手动保存" | "里程碑"
}

// ── 编辑器配置 ──

export interface WritingConfig {
  /** 自动保存间隔（毫秒），默认 3000 */
  autoSaveInterval: number;

  /** 最大版本快照数，默认 50 */
  maxVersions: number;

  /** 是否启用专注模式（启动时） */
  focusModeDefault: boolean;

  /** 字体大小 */
  fontSize: number;

  /** 行高 */
  lineHeight: number;

  /** 主题 */
  theme: "dark" | "light";
}

// ── 操作结果 ──

export type WritingResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── 持久化适配器 ──

export interface VersionStorageAdapter {
  loadVersions(): VersionSnapshot[];
  saveVersions(versions: readonly VersionSnapshot[]): void;
}
