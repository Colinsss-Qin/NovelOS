// ================================================================
// Outline Skill — 校验逻辑
// ================================================================

import type {
  CreateStoryInput, UpdateStoryInput,
  CreateVolumeInput, UpdateVolumeInput,
  CreateChapterInput, UpdateChapterInput,
  CreateSceneInput, UpdateSceneInput,
} from "./types";

export interface ValidationErrors { field: string; message: string }

function isNonEmpty(v: unknown): v is string { return typeof v === "string" && v.trim().length > 0; }

// ═══ Story ═══
export function validateCreateStory(input: CreateStoryInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (!input.projectId?.trim()) e.push({ field: "projectId", message: "项目ID不能为空" });
  if (!input.title?.trim()) e.push({ field: "title", message: "故事标题不能为空" });
  return e;
}
export function validateUpdateStory(input: UpdateStoryInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (input.title !== undefined && !isNonEmpty(input.title)) e.push({ field: "title", message: "标题不能为空" });
  return e;
}

// ═══ Volume ═══
export function validateCreateVolume(input: CreateVolumeInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (!input.storyId?.trim()) e.push({ field: "storyId", message: "故事ID不能为空" });
  if (!input.title?.trim()) e.push({ field: "title", message: "卷标题不能为空" });
  if (input.order !== undefined && (typeof input.order !== "number" || input.order < 0))
    e.push({ field: "order", message: "排序号必须是非负整数" });
  return e;
}
export function validateUpdateVolume(input: UpdateVolumeInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (input.title !== undefined && !isNonEmpty(input.title)) e.push({ field: "title", message: "标题不能为空" });
  if (input.order !== undefined && (typeof input.order !== "number" || input.order < 0))
    e.push({ field: "order", message: "排序号必须是非负整数" });
  return e;
}

// ═══ Chapter ═══
export function validateCreateChapter(input: CreateChapterInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (!input.volumeId?.trim()) e.push({ field: "volumeId", message: "卷ID不能为空" });
  if (!input.title?.trim()) e.push({ field: "title", message: "章节标题不能为空" });
  return e;
}
export function validateUpdateChapter(input: UpdateChapterInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (input.title !== undefined && !isNonEmpty(input.title)) e.push({ field: "title", message: "标题不能为空" });
  return e;
}

// ═══ Scene ═══
export function validateCreateScene(input: CreateSceneInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (!input.chapterId?.trim()) e.push({ field: "chapterId", message: "章ID不能为空" });
  if (!input.title?.trim()) e.push({ field: "title", message: "场景标题不能为空" });
  return e;
}
export function validateUpdateScene(input: UpdateSceneInput): ValidationErrors[] {
  const e: ValidationErrors[] = [];
  if (input.title !== undefined && !isNonEmpty(input.title)) e.push({ field: "title", message: "标题不能为空" });
  return e;
}
