// ================================================================
// Writing Skill — 自动保存服务
// 防抖保存 + Outline Skill API 调用 + 版本快照
// ================================================================

import type { EditTarget, WritingConfig } from "./types";
import { quickCount } from "./word-counter";
import { createSnapshot } from "./version-manager";

const DEFAULT_CONFIG: WritingConfig = {
  autoSaveInterval: 3000,
  maxVersions: 50,
  focusModeDefault: false,
  fontSize: 16,
  lineHeight: 2.0,
  theme: "dark",
};

let config: WritingConfig = { ...DEFAULT_CONFIG };
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSavedContent: string = "";
let onSaveCallback: ((target: EditTarget) => void) | null = null;

// ═══════════════════════════════════
//  Public API
// ═══════════════════════════════════

export function setConfig(partial: Partial<WritingConfig>): void {
  config = { ...config, ...partial };
}

export function getConfig(): WritingConfig {
  return { ...config };
}

export function onSave(cb: (target: EditTarget) => void): void {
  onSaveCallback = cb;
}

/**
 * 触发自动保存（防抖）。
 * 内容未变化时跳过。
 */
export function scheduleSave(target: EditTarget, content: string): void {
  if (content === lastSavedContent) return;

  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    _doSave(target, content);
  }, config.autoSaveInterval);
}

/**
 * 立即保存（跳过防抖）。
 */
export function saveNow(target: EditTarget, content: string): Promise<boolean> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  return _doSave(target, content);
}

/**
 * 获取最后一次保存的内容。
 */
export function getLastSavedContent(): string {
  return lastSavedContent;
}

/**
 * 重置保存状态（切换编辑目标时调用）。
 */
export function resetSaveState(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  lastSavedContent = "";
}

// ═══════════════════════════════════
//  Internal
// ═══════════════════════════════════

async function _doSave(target: EditTarget, content: string): Promise<boolean> {
  const endpoint =
    target.type === "chapter"
      ? `/api/outline/chapters/${target.id}`
      : `/api/outline/scenes/${target.id}`;

  const wc = quickCount(content);

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, wordCount: wc }),
    });
    const json = await res.json();

    if (json.success) {
      lastSavedContent = content;
      // 创建版本快照
      createSnapshot(target.id, target.type, content, wc, "自动保存");
      // 更新 target wordCount
      target.wordCount = wc;
      target.content = content;
      if (onSaveCallback) onSaveCallback(target);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("WritingSkill: save failed", (err as Error).message);
    return false;
  }
}
