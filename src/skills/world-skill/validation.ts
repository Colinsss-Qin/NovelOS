// ================================================================
// World Skill — 校验逻辑
// ================================================================

import type {
  CreateLocationInput, UpdateLocationInput,
  CreateFactionInput, UpdateFactionInput,
  CreateLoreInput, UpdateLoreInput,
} from "./types";

export interface ValidationErrors {
  field: string;
  message: string;
}

// ── helpers ──

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isOptionalString(v: unknown): boolean {
  return v === undefined || typeof v === "string";
}

function isOptionalPositiveInt(v: unknown): boolean {
  return v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0);
}

function isOptionalInRange(v: unknown, min: number, max: number): boolean {
  return v === undefined || (typeof v === "number" && v >= min && v <= max);
}

// ═══════════════════════════════════
//  Location
// ═══════════════════════════════════

export function validateCreateLocation(input: CreateLocationInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (!input.projectId?.trim()) errors.push({ field: "projectId", message: "项目ID不能为空" });
  if (!input.name?.trim()) errors.push({ field: "name", message: "地点名称不能为空" });
  if (input.description !== undefined && !isOptionalString(input.description))
    errors.push({ field: "description", message: "描述必须是字符串" });
  if (input.parentLocationId !== undefined && !isOptionalString(input.parentLocationId))
    errors.push({ field: "parentLocationId", message: "父地点ID必须是字符串" });
  if (input.population !== undefined && !isOptionalPositiveInt(input.population))
    errors.push({ field: "population", message: "人口必须是非负整数" });
  return errors;
}

export function validateUpdateLocation(input: UpdateLocationInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (input.name !== undefined && !isNonEmptyString(input.name))
    errors.push({ field: "name", message: "地点名称不能为空" });
  if (input.population !== undefined && !isOptionalPositiveInt(input.population))
    errors.push({ field: "population", message: "人口必须是非负整数" });
  return errors;
}

// ═══════════════════════════════════
//  Faction
// ═══════════════════════════════════

export function validateCreateFaction(input: CreateFactionInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (!input.projectId?.trim()) errors.push({ field: "projectId", message: "项目ID不能为空" });
  if (!input.name?.trim()) errors.push({ field: "name", message: "势力名称不能为空" });
  if (input.influence !== undefined && !isOptionalInRange(input.influence, 0, 100))
    errors.push({ field: "influence", message: "影响力必须在 0-100 之间" });
  if (input.leader !== undefined && !isOptionalString(input.leader))
    errors.push({ field: "leader", message: "领袖必须是字符串" });
  return errors;
}

export function validateUpdateFaction(input: UpdateFactionInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (input.name !== undefined && !isNonEmptyString(input.name))
    errors.push({ field: "name", message: "势力名称不能为空" });
  if (input.influence !== undefined && !isOptionalInRange(input.influence, 0, 100))
    errors.push({ field: "influence", message: "影响力必须在 0-100 之间" });
  return errors;
}

// ═══════════════════════════════════
//  Lore
// ═══════════════════════════════════

export function validateCreateLore(input: CreateLoreInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (!input.projectId?.trim()) errors.push({ field: "projectId", message: "项目ID不能为空" });
  if (!input.title?.trim()) errors.push({ field: "title", message: "知识标题不能为空" });
  if (input.content !== undefined && !isOptionalString(input.content))
    errors.push({ field: "content", message: "内容必须是字符串" });
  return errors;
}

export function validateUpdateLore(input: UpdateLoreInput): ValidationErrors[] {
  const errors: ValidationErrors[] = [];
  if (input.title !== undefined && !isNonEmptyString(input.title))
    errors.push({ field: "title", message: "知识标题不能为空" });
  return errors;
}
