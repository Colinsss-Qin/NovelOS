// ================================================================
// Outline Skill — 持久化适配器
// ================================================================

import type { Story, Volume, Chapter, Scene, OutlineStorageAdapter } from "./types";

const S_KEY = "novelos-stories";
const V_KEY = "novelos-volumes";
const C_KEY = "novelos-chapters";
const SC_KEY = "novelos-scenes";

class LocalStorageAdapter implements OutlineStorageAdapter {
  private sk: string; private vk: string; private ck: string; private sck: string;

  constructor(storyKey?: string, volKey?: string, chKey?: string, sceneKey?: string) {
    this.sk = storyKey ?? S_KEY; this.vk = volKey ?? V_KEY;
    this.ck = chKey ?? C_KEY; this.sck = sceneKey ?? SC_KEY;
  }

  private _load<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch { console.warn("OutlineSkill: failed to load " + key); return []; }
  }

  private _save<T>(key: string, data: readonly T[]): void {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch { console.warn("OutlineSkill: failed to save " + key); }
  }

  loadStories(): Story[] { return this._load(this.sk); }
  saveStories(d: readonly Story[]) { this._save(this.sk, d); }
  loadVolumes(): Volume[] { return this._load(this.vk); }
  saveVolumes(d: readonly Volume[]) { this._save(this.vk, d); }
  loadChapters(): Chapter[] { return this._load(this.ck); }
  saveChapters(d: readonly Chapter[]) { this._save(this.ck, d); }
  loadScenes(): Scene[] { return this._load(this.sck); }
  saveScenes(d: readonly Scene[]) { this._save(this.sck, d); }
}

export { LocalStorageAdapter };
