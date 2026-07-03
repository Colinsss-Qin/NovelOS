// ================================================================
// Writing Skill — 版本持久化适配器
// ================================================================

import type { VersionSnapshot, VersionStorageAdapter } from "./types";

const VERSION_KEY = "novelos-writing-versions";

class LocalStorageVersionAdapter implements VersionStorageAdapter {
  private key: string;

  constructor(key?: string) {
    this.key = key ?? VERSION_KEY;
  }

  loadVersions(): VersionSnapshot[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as VersionSnapshot[]) : [];
    } catch {
      console.warn("WritingSkill: failed to load versions from localStorage");
      return [];
    }
  }

  saveVersions(versions: readonly VersionSnapshot[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(versions));
    } catch {
      console.warn("WritingSkill: failed to save versions to localStorage");
    }
  }
}

export { LocalStorageVersionAdapter };
