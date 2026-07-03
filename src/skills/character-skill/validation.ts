// ================================================================
// Character Skill — 校验逻辑
// ================================================================

import type {
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateRelationInput,
  GENDERS,
  RACES,
  CHARACTER_STATUSES,
  RELATION_TYPES,
} from "./types";

// ── 字符串校验 ──

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  return typeof value === "string";
}

function isPositiveIntegerOrZero(value: unknown): boolean {
  if (value === undefined || value === null) return true; // optional
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isInSet<T extends string>(
  value: unknown,
  set: readonly T[]
): value is T {
  if (value === undefined) return true; // optional
  return typeof value === "string" && (set as readonly string[]).includes(value);
}

// ── 人物校验 ──

export interface ValidationErrors {
  field: string;
  message: string;
}

export function validateCreateCharacter(
  input: CreateCharacterInput
): ValidationErrors[] {
  const errors: ValidationErrors[] = [];

  // Required
  if (!input.projectId || !input.projectId.trim()) {
    errors.push({ field: "projectId", message: "项目ID不能为空" });
  }
  if (!input.name || !input.name.trim()) {
    errors.push({ field: "name", message: "角色名称不能为空" });
  }

  // Type checks for optional fields
  if (input.alias !== undefined && !isOptionalString(input.alias)) {
    errors.push({ field: "alias", message: "别名必须是字符串" });
  }
  if (input.age !== undefined && !isPositiveIntegerOrZero(input.age)) {
    errors.push({ field: "age", message: "年龄必须是非负整数" });
  }
  if (input.birthday !== undefined && !isOptionalString(input.birthday)) {
    errors.push({ field: "birthday", message: "生日必须是字符串" });
  }
  if (input.gender !== undefined && !isInSet(input.gender, ["男", "女", "其他", "未知"] as const)) {
    errors.push({ field: "gender", message: "性别值无效" });
  }
  if (input.race !== undefined && !isOptionalString(input.race)) {
    errors.push({ field: "race", message: "种族必须是字符串" });
  }
  if (input.occupation !== undefined && !isOptionalString(input.occupation)) {
    errors.push({ field: "occupation", message: "职业必须是字符串" });
  }

  return errors;
}

export function validateUpdateCharacter(
  input: UpdateCharacterInput
): ValidationErrors[] {
  const errors: ValidationErrors[] = [];

  if (input.name !== undefined && !isNonEmptyString(input.name)) {
    errors.push({ field: "name", message: "角色名称不能为空" });
  }
  if (input.alias !== undefined && !isOptionalString(input.alias)) {
    errors.push({ field: "alias", message: "别名必须是字符串" });
  }
  if (input.age !== undefined && !isPositiveIntegerOrZero(input.age)) {
    errors.push({ field: "age", message: "年龄必须是非负整数" });
  }
  if (input.gender !== undefined && !isInSet(input.gender, ["男", "女", "其他", "未知"] as const)) {
    errors.push({ field: "gender", message: "性别值无效" });
  }
  if (input.status !== undefined && !isInSet(input.status, ["active", "deceased", "archived", "suspended"] as const)) {
    errors.push({ field: "status", message: "状态值无效" });
  }

  return errors;
}

// ── 关系校验 ──

export function validateCreateRelation(
  input: CreateRelationInput
): ValidationErrors[] {
  const errors: ValidationErrors[] = [];

  if (!input.projectId || !input.projectId.trim()) {
    errors.push({ field: "projectId", message: "项目ID不能为空" });
  }
  if (!input.sourceCharacterId || !input.sourceCharacterId.trim()) {
    errors.push({ field: "sourceCharacterId", message: "源角色ID不能为空" });
  }
  if (!input.targetCharacterId || !input.targetCharacterId.trim()) {
    errors.push({ field: "targetCharacterId", message: "目标角色ID不能为空" });
  }
  if (input.sourceCharacterId === input.targetCharacterId) {
    errors.push({ field: "targetCharacterId", message: "不能与自己建立关系" });
  }
  if (!input.relationType) {
    errors.push({ field: "relationType", message: "关系类型不能为空" });
  } else if (
    !isInSet(input.relationType, [
      "亲属", "朋友", "恋人", "师徒", "敌人", "同事", "上下级", "组织成员",
    ] as const)
  ) {
    errors.push({ field: "relationType", message: "关系类型无效" });
  }

  return errors;
}
