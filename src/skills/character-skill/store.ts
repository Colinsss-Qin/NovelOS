// ================================================================
// Character Skill — Zustand Store（严格类型，零 any）
// ================================================================

import { create } from "zustand";
import type {
  Character,
  CharacterRelation,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateRelationInput,
  UpdateRelationInput,
  CharacterFilter,
  RelationFilter,
  CharacterResult,
  RelationResult,
  CharacterStorageAdapter,
  IdGenerator,
} from "./types";
import {
  validateCreateCharacter,
  validateUpdateCharacter,
  validateCreateRelation,
} from "./validation";
import { hasRelationType } from "./relation";

// ── 默认实现 ──

const defaultIdGenerator: IdGenerator = () => {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `char_${t}_${r}`;
};

class MemoryStorageAdapter implements CharacterStorageAdapter {
  private characters: Character[] = [];
  private relations: CharacterRelation[] = [];

  loadCharacters(): Character[] {
    return this.characters;
  }
  saveCharacters(characters: readonly Character[]): void {
    this.characters = [...characters];
  }
  loadRelations(): CharacterRelation[] {
    return this.relations;
  }
  saveRelations(relations: readonly CharacterRelation[]): void {
    this.relations = [...relations];
  }
}

// ── Store State ──

interface CharacterStoreState {
  characters: Record<string, Character>;     // id → Character
  relations: Record<string, CharacterRelation>; // id → Relation
  idGenerator: IdGenerator;
  storage: CharacterStorageAdapter;
}

// ── Store Actions ──

interface CharacterStoreActions {
  setStorage: (adapter: CharacterStorageAdapter) => void;
  setIdGenerator: (gen: IdGenerator) => void;
  loadFromStorage: () => void;

  // Character CRUD
  createCharacter: (input: CreateCharacterInput) => CharacterResult<Character>;
  updateCharacter: (id: string, input: UpdateCharacterInput) => CharacterResult<Character>;
  deleteCharacter: (id: string) => CharacterResult<null>;
  getCharacter: (id: string) => CharacterResult<Character>;
  listCharacters: (filter: CharacterFilter) => CharacterResult<Character[]>;

  // Relation CRUD
  createRelation: (input: CreateRelationInput) => RelationResult<CharacterRelation>;
  updateRelation: (id: string, input: UpdateRelationInput) => RelationResult<CharacterRelation>;
  deleteRelation: (id: string) => RelationResult<null>;
  getRelation: (id: string) => RelationResult<CharacterRelation>;
  listRelations: (filter: RelationFilter) => RelationResult<CharacterRelation[]>;
}

type CharacterStore = CharacterStoreState & CharacterStoreActions;

// ── 辅助：构建默认值 ──

function buildCharacter(input: CreateCharacterInput, id: string): Character {
  const now = new Date().toISOString();
  return {
    id,
    projectId: input.projectId.trim(),
    name: input.name.trim(),
    alias: input.alias?.trim() ?? "",
    gender: input.gender ?? "未知",
    age: input.age ?? 0,
    birthday: input.birthday ?? "",
    race: input.race ?? "人类",
    occupation: input.occupation?.trim() ?? "",
    appearance: input.appearance?.trim() ?? "",
    personality: input.personality?.trim() ?? "",
    background: input.background?.trim() ?? "",
    goal: input.goal?.trim() ?? "",
    motivation: input.motivation?.trim() ?? "",
    status: "active",
    notes: input.notes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

function buildRelation(
  input: CreateRelationInput,
  id: string
): CharacterRelation {
  return {
    id,
    projectId: input.projectId.trim(),
    sourceCharacterId: input.sourceCharacterId.trim(),
    targetCharacterId: input.targetCharacterId.trim(),
    relationType: input.relationType,
    description: input.description?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════
//  Zustand Store
// ═══════════════════════════════════════

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
  characters: {},
  relations: {},
  idGenerator: defaultIdGenerator,
  storage: new MemoryStorageAdapter(),

  // ── 配置 ──

  setStorage: (adapter) => set({ storage: adapter }),
  setIdGenerator: (gen) => set({ idGenerator: gen }),

  loadFromStorage: () => {
    const { storage } = get();
    const chars: Record<string, Character> = {};
    for (const c of storage.loadCharacters()) chars[c.id] = c;
    const rels: Record<string, CharacterRelation> = {};
    for (const r of storage.loadRelations()) rels[r.id] = r;
    set({ characters: chars, relations: rels });
  },

  // ═══════════════════════════════════
  //  Character CRUD
  // ═══════════════════════════════════

  createCharacter: (input) => {
    const errors = validateCreateCharacter(input);
    if (errors.length > 0) {
      return { success: false, error: errors.map((e) => e.message).join("; ") };
    }

    const id = get().idGenerator();
    const character = buildCharacter(input, id);

    set((s) => ({
      characters: { ...s.characters, [id]: character },
    }));

    get().storage.saveCharacters(Object.values(get().characters));
    return { success: true, data: character };
  },

  updateCharacter: (id, input) => {
    const existing = get().characters[id];
    if (!existing) {
      return { success: false, error: `角色不存在: ${id}` };
    }

    const errors = validateUpdateCharacter(input);
    if (errors.length > 0) {
      return { success: false, error: errors.map((e) => e.message).join("; ") };
    }

    const updated: Character = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      alias: input.alias?.trim() ?? existing.alias,
      gender: input.gender ?? existing.gender,
      age: input.age ?? existing.age,
      birthday: input.birthday ?? existing.birthday,
      race: input.race ?? existing.race,
      occupation: input.occupation?.trim() ?? existing.occupation,
      appearance: input.appearance?.trim() ?? existing.appearance,
      personality: input.personality?.trim() ?? existing.personality,
      background: input.background?.trim() ?? existing.background,
      goal: input.goal?.trim() ?? existing.goal,
      motivation: input.motivation?.trim() ?? existing.motivation,
      status: input.status ?? existing.status,
      notes: input.notes?.trim() ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      characters: { ...s.characters, [id]: updated },
    }));

    get().storage.saveCharacters(Object.values(get().characters));
    return { success: true, data: updated };
  },

  deleteCharacter: (id) => {
    const existing = get().characters[id];
    if (!existing) {
      return { success: false, error: `角色不存在: ${id}` };
    }

    // 级联删除该人物的所有关系
    const { [id]: _removed, ...restChars } = get().characters;
    const remainingRels: Record<string, CharacterRelation> = {};
    for (const rel of Object.values(get().relations)) {
      if (
        rel.sourceCharacterId !== id &&
        rel.targetCharacterId !== id
      ) {
        remainingRels[rel.id] = rel;
      }
    }

    const deletedRelCount =
      Object.keys(get().relations).length - Object.keys(remainingRels).length;

    set({ characters: restChars, relations: remainingRels });

    const state = get();
    state.storage.saveCharacters(Object.values(state.characters));
    state.storage.saveRelations(Object.values(state.relations));

    const msg =
      deletedRelCount > 0
        ? `已删除角色及其 ${deletedRelCount} 条关联关系`
        : undefined;
    return { success: true, data: null, ...(msg ? { _info: msg } as Record<string, unknown> : {}) } as CharacterResult<null>;
  },

  getCharacter: (id) => {
    const char = get().characters[id];
    if (!char) return { success: false, error: `角色不存在: ${id}` };
    return { success: true, data: char };
  },

  listCharacters: (filter) => {
    let list = Object.values(get().characters).filter(
      (c) => c.projectId === filter.projectId
    );

    if (filter.status) list = list.filter((c) => c.status === filter.status);
    if (filter.gender) list = list.filter((c) => c.gender === filter.gender);
    if (filter.race) list = list.filter((c) => c.race === filter.race);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.alias.toLowerCase().includes(q) ||
          c.personality.toLowerCase().includes(q) ||
          c.background.toLowerCase().includes(q) ||
          c.occupation.toLowerCase().includes(q)
      );
    }

    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return { success: true, data: list };
  },

  // ═══════════════════════════════════
  //  Relation CRUD
  // ═══════════════════════════════════

  createRelation: (input) => {
    const errors = validateCreateRelation(input);
    if (errors.length > 0) {
      return { success: false, error: errors.map((e) => e.message).join("; ") };
    }

    // 验证两个角色都存在
    const { characters, relations } = get();
    if (!characters[input.sourceCharacterId]) {
      return { success: false, error: `源角色不存在: ${input.sourceCharacterId}` };
    }
    if (!characters[input.targetCharacterId]) {
      return { success: false, error: `目标角色不存在: ${input.targetCharacterId}` };
    }

    // 检查同类型关系是否已存在（防止重复）
    if (
      hasRelationType(
        Object.values(relations),
        input.sourceCharacterId,
        input.targetCharacterId,
        input.relationType
      )
    ) {
      return { success: false, error: "该类型的关系已存在" };
    }

    const id = get().idGenerator();
    const relation = buildRelation(input, id);

    set((s) => ({
      relations: { ...s.relations, [id]: relation },
    }));

    get().storage.saveRelations(Object.values(get().relations));
    return { success: true, data: relation };
  },

  updateRelation: (id, input) => {
    const existing = get().relations[id];
    if (!existing) {
      return { success: false, error: `关系不存在: ${id}` };
    }

    const updated: CharacterRelation = {
      ...existing,
      relationType: input.relationType ?? existing.relationType,
      description: input.description?.trim() ?? existing.description,
    };

    set((s) => ({
      relations: { ...s.relations, [id]: updated },
    }));

    get().storage.saveRelations(Object.values(get().relations));
    return { success: true, data: updated };
  },

  deleteRelation: (id) => {
    if (!get().relations[id]) {
      return { success: false, error: `关系不存在: ${id}` };
    }

    const { [id]: _removed, ...rest } = get().relations;
    set({ relations: rest });

    get().storage.saveRelations(Object.values(get().relations));
    return { success: true, data: null };
  },

  getRelation: (id) => {
    const rel = get().relations[id];
    if (!rel) return { success: false, error: `关系不存在: ${id}` };
    return { success: true, data: rel };
  },

  listRelations: (filter) => {
    let list = Object.values(get().relations).filter(
      (r) => r.projectId === filter.projectId
    );

    if (filter.characterId) {
      const cid = filter.characterId;
      list = list.filter(
        (r) => r.sourceCharacterId === cid || r.targetCharacterId === cid
      );
    }
    if (filter.relationType) {
      list = list.filter((r) => r.relationType === filter.relationType);
    }
    if (filter.sourceCharacterId) {
      list = list.filter((r) => r.sourceCharacterId === filter.sourceCharacterId);
    }
    if (filter.targetCharacterId) {
      list = list.filter((r) => r.targetCharacterId === filter.targetCharacterId);
    }

    return { success: true, data: list };
  },
}));
