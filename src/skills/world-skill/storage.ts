// ================================================================
// World Skill — 持久化适配器
// ================================================================

import type { Location, Faction, Lore, WorldStorageAdapter } from "./types";

const LOC_KEY = "novelos-locations";
const FAC_KEY = "novelos-factions";
const LORE_KEY = "novelos-lores";

class LocalStorageAdapter implements WorldStorageAdapter {
  private lk: string; private fk: string; private lrk: string;

  constructor(locKey?: string, facKey?: string, loreKey?: string) {
    this.lk = locKey ?? LOC_KEY; this.fk = facKey ?? FAC_KEY; this.lrk = loreKey ?? LORE_KEY;
  }

  private _load<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch { console.warn("WorldSkill: failed to load from " + key); return []; }
  }

  private _save<T>(key: string, data: readonly T[]): void {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { console.warn("WorldSkill: failed to save to " + key); }
  }

  loadLocations(): Location[] { return this._load(this.lk); }
  saveLocations(l: readonly Location[]): void { this._save(this.lk, l); }
  loadFactions(): Faction[] { return this._load(this.fk); }
  saveFactions(f: readonly Faction[]): void { this._save(this.fk, f); }
  loadLores(): Lore[] { return this._load(this.lrk); }
  saveLores(l: readonly Lore[]): void { this._save(this.lrk, l); }
}

export { LocalStorageAdapter };
