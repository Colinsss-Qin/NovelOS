// ================================================================
// Character Skill — 持久化适配器
// ================================================================

import type { Character, CharacterRelation, CharacterStorageAdapter } from "./types";

const CHAR_KEY = "novelos-characters";
const REL_KEY = "novelos-character-relations";

// ═══════════════════════════════════════
//  LocalStorage 适配器（浏览器端）
// ═══════════════════════════════════════

class LocalStorageAdapter implements CharacterStorageAdapter {
  private charKey: string;
  private relKey: string;

  constructor(charKey?: string, relKey?: string) {
    this.charKey = charKey ?? CHAR_KEY;
    this.relKey = relKey ?? REL_KEY;
  }

  loadCharacters(): Character[] {
    try {
      const raw = localStorage.getItem(this.charKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as Character[];
    } catch {
      console.warn("CharacterSkill: failed to load characters from localStorage");
      return [];
    }
  }

  saveCharacters(characters: readonly Character[]): void {
    try {
      localStorage.setItem(this.charKey, JSON.stringify(characters));
    } catch {
      console.warn("CharacterSkill: failed to save characters to localStorage");
    }
  }

  loadRelations(): CharacterRelation[] {
    try {
      const raw = localStorage.getItem(this.relKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as CharacterRelation[];
    } catch {
      console.warn("CharacterSkill: failed to load relations from localStorage");
      return [];
    }
  }

  saveRelations(relations: readonly CharacterRelation[]): void {
    try {
      localStorage.setItem(this.relKey, JSON.stringify(relations));
    } catch {
      console.warn("CharacterSkill: failed to save relations to localStorage");
    }
  }
}

export { LocalStorageAdapter };
