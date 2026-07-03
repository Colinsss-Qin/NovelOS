// ================================================================
// Writing Skill — 公共 API
// 编辑器状态管理 · 自动保存 · 版本历史 · 字数统计 · 专注模式
// ================================================================

import { useWritingStore } from "./store";
import type {
  EditTarget, EditTargetType,
  EditorState, WordStats, WritingConfig, VersionSnapshot,
  WritingResult, VersionStorageAdapter,
} from "./types";

// ── 类型导出 ──
export type {
  EditTarget, EditTargetType,
  EditorState, WordStats, WritingConfig, VersionSnapshot,
  WritingResult, VersionStorageAdapter,
} from "./types";

export { LocalStorageVersionAdapter } from "./storage";
export { countWords, quickCount, formatWordCount } from "./word-counter";
export type { VersionSnapshot as Version } from "./types";

// ═══════════════════════════════════
//  Editor API
// ═══════════════════════════════════

/** 打开编辑目标（章节或场景） */
export function openTarget(target: EditTarget): void {
  useWritingStore.getState().openTarget(target);
}

/** 关闭当前编辑目标 */
export function closeTarget(): void {
  useWritingStore.getState().closeTarget();
}

/** 更新编辑器内容（触发自动保存防抖） */
export function updateContent(content: string): void {
  useWritingStore.getState().updateContent(content);
}

/** 强制立即保存 */
export function forceSave(): Promise<boolean> {
  return useWritingStore.getState().forceSave();
}

/** 清除脏标记 */
export function markClean(): void {
  useWritingStore.getState().markClean();
}

// ═══════════════════════════════════
//  Focus Mode
// ═══════════════════════════════════

export function toggleFocusMode(): void {
  useWritingStore.getState().toggleFocusMode();
}

export function setFocusMode(on: boolean): void {
  useWritingStore.getState().setFocusMode(on);
}

// ═══════════════════════════════════
//  Word Stats
// ═══════════════════════════════════

export function getWordStats(): WordStats {
  return useWritingStore.getState().getWordStats();
}

export function getFormattedWordCount(): string {
  return useWritingStore.getState().getFormattedWordCount();
}

// ═══════════════════════════════════
//  Version History
// ═══════════════════════════════════

export function createMilestone(label: string): WritingResult<string> {
  return useWritingStore.getState().createMilestone(label);
}

export function getVersions(): VersionSnapshot[] {
  return useWritingStore.getState().getVersions();
}

export function restoreVersion(versionId: string): WritingResult<string> {
  return useWritingStore.getState().restoreVersion(versionId);
}

export function removeVersion(versionId: string): boolean {
  return useWritingStore.getState().removeVersion(versionId);
}

export function clearAllVersions(): number {
  return useWritingStore.getState().clearAllVersions();
}

// ═══════════════════════════════════
//  Reference Data
// ═══════════════════════════════════

export function setCharNames(names: Record<string, string>): void {
  useWritingStore.getState().setCharNames(names);
}

export function setLocNames(names: Record<string, string>): void {
  useWritingStore.getState().setLocNames(names);
}

export function setFacNames(names: Record<string, string>): void {
  useWritingStore.getState().setFacNames(names);
}

// ═══════════════════════════════════
//  Config
// ═══════════════════════════════════

export function updateConfig(partial: Partial<WritingConfig>): void {
  useWritingStore.getState().updateConfig(partial);
}

// ═══════════════════════════════════
//  Lifecycle
// ═══════════════════════════════════

export function init(): void {
  useWritingStore.getState().init();
}

export function destroy(): void {
  useWritingStore.getState().destroy();
}

// ═══════════════════════════════════
//  Snapshot (get full state at once)
// ═══════════════════════════════════

export function getEditorState(): EditorState {
  return useWritingStore.getState().editor;
}

export function subscribe(callback: (state: EditorState) => void): () => void {
  return useWritingStore.subscribe((s) => callback(s.editor));
}
