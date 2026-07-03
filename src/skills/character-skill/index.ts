// ================================================================
// Character Skill — 公共 API
// 提供 createCharacter / updateCharacter / deleteCharacter /
//       getCharacter / listCharacters /
//       createRelation / updateRelation / deleteRelation /
//       getRelation / listRelations
// ================================================================

import { useCharacterStore } from "./store";
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
} from "./types";

// ── 重新导出类型 ──
export type {
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
  CharacterStatus,
  Gender,
  Race,
  RelationType,
} from "./types";

export { GENDERS, RACES, CHARACTER_STATUSES, RELATION_TYPES } from "./types";

// ── 重新导出辅助 ──
export {
  getRelationsBetween,
  getCharacterRelations,
  filterByType,
  hasRelationType,
  getRelationGraph,
} from "./relation";

export { LocalStorageAdapter } from "./storage";

// ═══════════════════════════════════════
//  Character API
// ═══════════════════════════════════════

export function createCharacter(
  input: CreateCharacterInput
): CharacterResult<Character> {
  return useCharacterStore.getState().createCharacter(input);
}

export function updateCharacter(
  id: string,
  input: UpdateCharacterInput
): CharacterResult<Character> {
  return useCharacterStore.getState().updateCharacter(id, input);
}

export function deleteCharacter(id: string): CharacterResult<null> {
  return useCharacterStore.getState().deleteCharacter(id);
}

export function getCharacter(id: string): CharacterResult<Character> {
  return useCharacterStore.getState().getCharacter(id);
}

export function listCharacters(
  filter: CharacterFilter
): CharacterResult<Character[]> {
  return useCharacterStore.getState().listCharacters(filter);
}

// ═══════════════════════════════════════
//  Relation API
// ═══════════════════════════════════════

export function createRelation(
  input: CreateRelationInput
): RelationResult<CharacterRelation> {
  return useCharacterStore.getState().createRelation(input);
}

export function updateRelation(
  id: string,
  input: UpdateRelationInput
): RelationResult<CharacterRelation> {
  return useCharacterStore.getState().updateRelation(id, input);
}

export function deleteRelation(id: string): RelationResult<null> {
  return useCharacterStore.getState().deleteRelation(id);
}

export function getRelation(id: string): RelationResult<CharacterRelation> {
  return useCharacterStore.getState().getRelation(id);
}

export function listRelations(
  filter: RelationFilter
): RelationResult<CharacterRelation[]> {
  return useCharacterStore.getState().listRelations(filter);
}

// ═══════════════════════════════════════
//  配置 API
// ═══════════════════════════════════════

export function setStorageAdapter(adapter: CharacterStorageAdapter): void {
  useCharacterStore.getState().setStorage(adapter);
}

export function loadFromStorage(): void {
  useCharacterStore.getState().loadFromStorage();
}

export function subscribe(
  callback: (characters: Character[], relations: CharacterRelation[]) => void
): () => void {
  return useCharacterStore.subscribe((state) => {
    callback(
      Object.values(state.characters),
      Object.values(state.relations)
    );
  });
}
