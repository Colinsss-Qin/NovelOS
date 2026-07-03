// ================================================================
// Character Skill — 类型定义（严格模式，零 any）
// ================================================================

// ── 枚举 ──

export const GENDERS = ["男", "女", "其他", "未知"] as const;
export type Gender = (typeof GENDERS)[number];

export const RACES = [
  "人类", "精灵", "矮人", "兽人", "龙裔", "魔族",
  "仙族", "妖族", "亡灵", "半神", "机械", "其他",
] as const;
export type Race = (typeof RACES)[number];

export const CHARACTER_STATUSES = [
  "active",    // 活跃
  "deceased",  // 已故
  "archived",  // 归档
  "suspended", // 暂停使用
] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

export const RELATION_TYPES = [
  "亲属",
  "朋友",
  "恋人",
  "师徒",
  "敌人",
  "同事",
  "上下级",
  "组织成员",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

// ── 人物 ──

export interface Character {
  readonly id: string;
  projectId: string;
  name: string;
  alias: string;
  gender: Gender;
  age: number;
  birthday: string;        // "YYYY-MM-DD" or ""
  race: Race;
  occupation: string;
  appearance: string;
  personality: string;
  background: string;
  goal: string;
  motivation: string;
  status: CharacterStatus;
  notes: string;
  readonly createdAt: string;   // ISO 8601
  updatedAt: string;            // ISO 8601
}

// ── 人物关系 ──

export interface CharacterRelation {
  readonly id: string;
  projectId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationType: RelationType;
  description: string;
  readonly createdAt: string;
}

// ── 输入类型 ──

export interface CreateCharacterInput {
  projectId: string;
  name: string;
  alias?: string;
  gender?: Gender;
  age?: number;
  birthday?: string;
  race?: Race;
  occupation?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  goal?: string;
  motivation?: string;
  notes?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  alias?: string;
  gender?: Gender;
  age?: number;
  birthday?: string;
  race?: Race;
  occupation?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  goal?: string;
  motivation?: string;
  status?: CharacterStatus;
  notes?: string;
}

export interface CreateRelationInput {
  projectId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationType: RelationType;
  description?: string;
}

export interface UpdateRelationInput {
  relationType?: RelationType;
  description?: string;
}

// ── 查询过滤 ──

export interface CharacterFilter {
  projectId: string;
  status?: CharacterStatus;
  gender?: Gender;
  race?: Race;
  search?: string;      // 模糊匹配 name / alias / personality / background
  tag?: string;         // 预留：未来 tag 系统
}

export interface RelationFilter {
  projectId: string;
  characterId?: string;           // 查询该人物的所有关系
  relationType?: RelationType;
  sourceCharacterId?: string;     // 以该人物为源
  targetCharacterId?: string;     // 以该人物为目标
}

// ── 操作结果 ──

export type CharacterResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RelationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── 持久化 ──

export interface CharacterStorageAdapter {
  loadCharacters(): Character[];
  saveCharacters(characters: readonly Character[]): void;
  loadRelations(): CharacterRelation[];
  saveRelations(relations: readonly CharacterRelation[]): void;
}

export type IdGenerator = () => string;
