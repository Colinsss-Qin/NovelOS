// ================================================================
// Writing Skill — 版本管理器
// 快照创建 · 列表 · 恢复 · 修剪
// ================================================================

import type {
  VersionSnapshot,
  EditTargetType,
  VersionStorageAdapter,
} from "./types";

const defaultIdGenerator = () =>
  "ver_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);

class MemoryVersionStorage implements VersionStorageAdapter {
  private data: VersionSnapshot[] = [];
  loadVersions(): VersionSnapshot[] { return this.data; }
  saveVersions(v: readonly VersionSnapshot[]): void { this.data = [...v]; }
}

let versions: VersionSnapshot[] = [];
let storage: VersionStorageAdapter = new MemoryVersionStorage();
let maxVersions = 50;

// ═══════════════════════════════════
//  Public API
// ═══════════════════════════════════

export function setStorage(adapter: VersionStorageAdapter): void {
  storage = adapter;
}

export function setMaxVersions(n: number): void {
  maxVersions = n;
}

export function loadFromStorage(): void {
  versions = storage.loadVersions();
}

/**
 * 创建版本快照。
 */
export function createSnapshot(
  editTargetId: string,
  editTargetType: EditTargetType,
  content: string,
  wordCount: number,
  label: string = "自动保存"
): VersionSnapshot {
  const snapshot: VersionSnapshot = {
    id: defaultIdGenerator(),
    editTargetId,
    editTargetType,
    content,
    wordCount,
    createdAt: new Date().toISOString(),
    label,
  };

  versions.push(snapshot);

  // 修剪超出上限的旧版本
  if (versions.length > maxVersions) {
    versions = versions.slice(versions.length - maxVersions);
  }

  persist();
  return snapshot;
}

/**
 * 获取某个编辑目标的所有版本，按时间倒序。
 */
export function listVersions(
  editTargetId: string,
  editTargetType: EditTargetType
): VersionSnapshot[] {
  return versions
    .filter(v => v.editTargetId === editTargetId && v.editTargetType === editTargetType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 获取某个版本的内容（用于恢复）。
 */
export function getVersionContent(versionId: string): string | null {
  const v = versions.find(v => v.id === versionId);
  return v ? v.content : null;
}

/**
 * 删除某个版本。
 */
export function deleteVersion(versionId: string): boolean {
  const idx = versions.findIndex(v => v.id === versionId);
  if (idx === -1) return false;
  versions.splice(idx, 1);
  persist();
  return true;
}

/**
 * 清除某个编辑目标的所有版本。
 */
export function clearVersions(editTargetId: string, editTargetType: EditTargetType): number {
  const before = versions.length;
  versions = versions.filter(
    v => !(v.editTargetId === editTargetId && v.editTargetType === editTargetType)
  );
  persist();
  return before - versions.length;
}

/** 获取版本总数 */
export function countVersions(): number {
  return versions.length;
}

function persist(): void {
  storage.saveVersions(versions);
}
