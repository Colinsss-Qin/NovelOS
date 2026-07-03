// ========== API 统一响应格式 ==========
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ========== 枚举类型 ==========
export const CharacterRole = {
  PROTAGONIST: "主角",
  SUPPORTING: "配角",
  ANTAGONIST: "反派",
  BACKGROUND: "路人",
} as const;
export type CharacterRole = (typeof CharacterRole)[keyof typeof CharacterRole];

export const CharacterStatus = {
  ACTIVE: "active",
  DECEASED: "deceased",
  ARCHIVED: "archived",
} as const;
export type CharacterStatus = (typeof CharacterStatus)[keyof typeof CharacterStatus];

export const ChapterStatus = {
  DRAFT: "draft",
  SEED_CONFIRMED: "seed_confirmed",
  GENERATED: "generated",
  REVISED: "revised",
  FINALIZED: "finalized",
} as const;
export type ChapterStatus = (typeof ChapterStatus)[keyof typeof ChapterStatus];

export const FutureSceneStatus = {
  PENDING: "pending",
  APPROACHING: "approaching",
  TRIGGERED: "triggered",
  WRITTEN: "written",
} as const;
export type FutureSceneStatus =
  (typeof FutureSceneStatus)[keyof typeof FutureSceneStatus];

export const FutureSceneType = {
  FAMOUS_SCENE: "名场面",
  CLASSIC_LINES: "经典台词",
  CLIMAX: "高潮",
  SATISFYING: "爽点",
  IMAGE: "画面",
  EMOTION_GOAL: "情绪目标",
} as const;
export type FutureSceneType =
  (typeof FutureSceneType)[keyof typeof FutureSceneType];

export const VolumeStatus = {
  DRAFT: "draft",
  WRITING: "writing",
  COMPLETED: "completed",
} as const;
export type VolumeStatus = (typeof VolumeStatus)[keyof typeof VolumeStatus];

// ========== AI 相关类型 ==========
export type AIProvider = "deepseek" | "claude" | "kimi";

export type GenerationType =
  | "chapter_generate"
  | "continue"
  | "rewrite"
  | "polish"
  | "outline"
  | "setting"
  | "dialogue"
  | "scene_analysis";

export interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export interface GenerateResult {
  content: string;
  tokenUsed: number;
  model: string;
  finishReason: string;
}

export interface AIProviderInterface {
  name: string;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
  generateStream(opts: GenerateOptions): AsyncGenerator<string>;
}

// ========== 上下文拼装类型 ==========
export interface AssembledContext {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
  sources: ContextSource[];
}

export interface ContextSource {
  type: "character" | "faction" | "location" | "rule" | "history" | "outline" | "summary" | "future_scene" | "reference";
  id: string;
  title: string;
  content: string;
  priority: number; // 1-9, 1 = highest
}
