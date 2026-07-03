// ================================================================
// Project Skill — 持久化适配器
// ================================================================

import type { Project, ProjectStorageAdapter } from "./types";

const STORAGE_KEY = "novelos-projects";

// ═══════════════════════════════════════
//  LocalStorage 适配器（浏览器端）
// ═══════════════════════════════════════

class LocalStorageAdapter implements ProjectStorageAdapter {
  private key: string;

  constructor(key?: string) {
    this.key = key ?? STORAGE_KEY;
  }

  load(): Project[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as Project[];
    } catch {
      console.warn("ProjectSkill: failed to load from localStorage");
      return [];
    }
  }

  save(projects: readonly Project[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(projects));
    } catch {
      console.warn("ProjectSkill: failed to save to localStorage");
    }
  }
}

// ═══════════════════════════════════════
//  Prisma 适配器（后端 — 骨架，待实现）
// ═══════════════════════════════════════

// class PrismaAdapter implements ProjectStorageAdapter {
//   constructor(private prisma: PrismaClient) {}
//
//   load(): Project[] {
//     // return prisma.project.findMany(...)
//     return [];
//   }
//
//   save(projects: readonly Project[]): void {
//     // upsert each project into prisma
//   }
// }

export { LocalStorageAdapter };
