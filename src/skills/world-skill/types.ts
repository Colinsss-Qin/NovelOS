// ================================================================
// World Skill — 类型定义（严格模式，零 any）
// Location · Faction · Lore
// ================================================================

// ── 枚举 ──

export const LOCATION_TYPES = [
  "大陆", "国家", "城市", "村镇", "山脉", "河流", "湖泊",
  "森林", "沙漠", "沼泽", "雪原", "高原", "海岛", "洞窟",
  "秘境", "建筑", "房间", "其他",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const FACTION_TYPES = [
  "帝国", "王国", "宗门", "家族", "商會", "佣兵团",
  "教派", "学院", "帮派", "秘密结社", "冒险者公会", "其他",
] as const;
export type FactionType = (typeof FACTION_TYPES)[number];

export const LORE_CATEGORIES = [
  "创世神话", "历史事件", "文化习俗", "宗教信仰",
  "魔法体系", "科技水平", "种族起源", "语言文字",
  "法律法规", "节日庆典", "传说预言", "其他",
] as const;
export type LoreCategory = (typeof LORE_CATEGORIES)[number];

export const ENTITY_STATUSES = ["active", "archived"] as const;
export type EntityStatus = (typeof ENTITY_STATUSES)[number];

// ── Location ──

export interface Location {
  readonly id: string;
  projectId: string;
  name: string;
  type: LocationType;
  description: string;
  parentLocationId: string;     // "" if top-level
  climate: string;
  resources: string;
  population: number;
  tags: readonly string[];
  status: EntityStatus;
  notes: string;
  readonly createdAt: string;
  updatedAt: string;
}

// ── Faction ──

export interface Faction {
  readonly id: string;
  projectId: string;
  name: string;
  type: FactionType;
  leader: string;               // leader name or characterId
  description: string;
  goal: string;
  influence: number;            // 0-100
  memberIds: readonly string[];  // references to Character.id
  locationIds: readonly string[];// references to Location.id
  tags: readonly string[];
  status: EntityStatus;
  readonly createdAt: string;
  updatedAt: string;
}

// ── Lore ──

export interface Lore {
  readonly id: string;
  projectId: string;
  title: string;
  category: LoreCategory;
  content: string;
  tags: readonly string[];
  relatedEntityIds: readonly string[]; // references to Character/Location/Faction.id
  status: EntityStatus;
  readonly createdAt: string;
  updatedAt: string;
}

// ── 输入类型 ──

export interface CreateLocationInput {
  projectId: string;
  name: string;
  type?: LocationType;
  description?: string;
  parentLocationId?: string;
  climate?: string;
  resources?: string;
  population?: number;
  tags?: string[];
  notes?: string;
}

export interface UpdateLocationInput {
  name?: string;
  type?: LocationType;
  description?: string;
  parentLocationId?: string;
  climate?: string;
  resources?: string;
  population?: number;
  tags?: string[];
  status?: EntityStatus;
  notes?: string;
}

export interface CreateFactionInput {
  projectId: string;
  name: string;
  type?: FactionType;
  leader?: string;
  description?: string;
  goal?: string;
  influence?: number;
  memberIds?: string[];
  locationIds?: string[];
  tags?: string[];
}

export interface UpdateFactionInput {
  name?: string;
  type?: FactionType;
  leader?: string;
  description?: string;
  goal?: string;
  influence?: number;
  memberIds?: string[];
  locationIds?: string[];
  tags?: string[];
  status?: EntityStatus;
}

export interface CreateLoreInput {
  projectId: string;
  title: string;
  category?: LoreCategory;
  content?: string;
  tags?: string[];
  relatedEntityIds?: string[];
}

export interface UpdateLoreInput {
  title?: string;
  category?: LoreCategory;
  content?: string;
  tags?: string[];
  relatedEntityIds?: string[];
  status?: EntityStatus;
}

// ── 查询过滤 ──

export interface LocationFilter {
  projectId: string;
  type?: LocationType;
  parentLocationId?: string;    // "" for top-level only
  status?: EntityStatus;
  search?: string;
}

export interface FactionFilter {
  projectId: string;
  type?: FactionType;
  status?: EntityStatus;
  search?: string;
}

export interface LoreFilter {
  projectId: string;
  category?: LoreCategory;
  status?: EntityStatus;
  search?: string;
}

// ── 操作结果 ──

export type WorldResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── 持久化适配器 ──

export interface WorldStorageAdapter {
  loadLocations(): Location[];
  saveLocations(locations: readonly Location[]): void;
  loadFactions(): Faction[];
  saveFactions(factions: readonly Faction[]): void;
  loadLores(): Lore[];
  saveLores(lores: readonly Lore[]): void;
}

export type IdGenerator = () => string;
