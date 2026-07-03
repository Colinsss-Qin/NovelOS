// ================================================================
// Writing Skill — Zustand Store
// 编辑器状态 · 内容管理 · 字数统计 · 专注模式 · 参考数据
// ================================================================

import { create } from "zustand";
import type {
  EditTarget, EditTargetType,
  EditorState, WordStats, WritingConfig,
  WritingResult,
} from "./types";
import { countWords, quickCount, formatWordCount } from "./word-counter";
import {
  scheduleSave, saveNow, resetSaveState,
  setConfig as setServiceConfig, getConfig,
} from "./service";
import {
  createSnapshot, listVersions, getVersionContent,
  deleteVersion, clearVersions, countVersions,
  setStorage as setVersionStorage, setMaxVersions,
  loadFromStorage as loadVersions,
} from "./version-manager";

// ── Store State ──

interface WritingStoreState {
  editor: EditorState;
  config: WritingConfig;
  /** 关联数据：人物名称映射 */
  charNames: Record<string, string>;
  /** 关联数据：地点名称映射 */
  locNames: Record<string, string>;
  /** 关联数据：势力名称映射 */
  facNames: Record<string, string>;
}

// ── Store Actions ──

interface WritingStoreActions {
  // Editor
  openTarget: (target: EditTarget) => void;
  closeTarget: () => void;
  updateContent: (content: string) => void;
  forceSave: () => Promise<boolean>;
  markClean: () => void;

  // Focus mode
  toggleFocusMode: () => void;
  setFocusMode: (on: boolean) => void;

  // Config
  updateConfig: (partial: Partial<WritingConfig>) => void;

  // Word stats
  getWordStats: () => WordStats;
  getFormattedWordCount: () => string;

  // Version history
  createMilestone: (label: string) => WritingResult<string>;
  getVersions: () => ReturnType<typeof listVersions>;
  restoreVersion: (versionId: string) => WritingResult<string>;
  removeVersion: (versionId: string) => boolean;
  clearAllVersions: () => number;

  // Reference data
  setCharNames: (names: Record<string, string>) => void;
  setLocNames: (names: Record<string, string>) => void;
  setFacNames: (names: Record<string, string>) => void;

  // Lifecycle
  init: () => void;
  destroy: () => void;
}

type WritingStore = WritingStoreState & WritingStoreActions;

// ═══════════════════════════════════
//  Store
// ═══════════════════════════════════

export const useWritingStore = create<WritingStore>()((set, get) => ({
  editor: {
    target: null, content: "", isDirty: false,
    lastSavedAt: null, isSaving: false, focusMode: false,
  },
  config: getConfig(),
  charNames: {}, locNames: {}, facNames: {},

  // ── Editor ──

  openTarget: (target: EditTarget) => {
    resetSaveState();
    set({
      editor: {
        target,
        content: target.content,
        isDirty: false,
        lastSavedAt: null,
        isSaving: false,
        focusMode: get().editor.focusMode,
      },
    });
  },

  closeTarget: () => {
    resetSaveState();
    set({
      editor: {
        target: null, content: "", isDirty: false,
        lastSavedAt: null, isSaving: false, focusMode: false,
      },
    });
  },

  updateContent: (content: string) => {
    const ed = get().editor;
    if (!ed.target) return;

    set({
      editor: {
        ...ed,
        content,
        isDirty: content !== ed.target.content,
      },
    });

    // 自动保存（防抖）
    scheduleSave(ed.target, content);
  },

  forceSave: async () => {
    const ed = get().editor;
    if (!ed.target) return false;

    set({ editor: { ...ed, isSaving: true } });
    const ok = await saveNow(ed.target, ed.content);
    set({
      editor: {
        ...get().editor,
        isDirty: !ok,
        lastSavedAt: ok ? new Date().toISOString() : ed.lastSavedAt,
        isSaving: false,
      },
    });
    return ok;
  },

  markClean: () => {
    set({ editor: { ...get().editor, isDirty: false } });
  },

  // ── Focus Mode ──

  toggleFocusMode: () => {
    set({ editor: { ...get().editor, focusMode: !get().editor.focusMode } });
  },

  setFocusMode: (on: boolean) => {
    set({ editor: { ...get().editor, focusMode: on } });
  },

  // ── Config ──

  updateConfig: (partial: Partial<WritingConfig>) => {
    setServiceConfig(partial);
    set({ config: getConfig() });
  },

  // ── Word Stats ──

  getWordStats: () => countWords(get().editor.content),
  getFormattedWordCount: () => formatWordCount(countWords(get().editor.content)),

  // ── Version History ──

  createMilestone: (label: string) => {
    const ed = get().editor;
    if (!ed.target) return { success: false, error: "未打开编辑目标" };
    const wc = quickCount(ed.content);
    const snap = createSnapshot(ed.target.id, ed.target.type, ed.content, wc, label);
    return { success: true, data: snap.id };
  },

  getVersions: () => {
    const ed = get().editor;
    if (!ed.target) return [];
    return listVersions(ed.target.id, ed.target.type);
  },

  restoreVersion: (versionId: string) => {
    const content = getVersionContent(versionId);
    if (content === null) return { success: false, error: "版本不存在" };
    // 更新编辑器内容
    const ed = get().editor;
    set({
      editor: { ...ed, content, isDirty: true },
    });
    // 立即保存
    if (ed.target) {
      scheduleSave(ed.target, content);
    }
    return { success: true, data: content };
  },

  removeVersion: (versionId: string) => deleteVersion(versionId),

  clearAllVersions: () => {
    const ed = get().editor;
    if (!ed.target) return 0;
    return clearVersions(ed.target.id, ed.target.type);
  },

  // ── Reference Data ──

  setCharNames: (names: Record<string, string>) => set({ charNames: names }),
  setLocNames: (names: Record<string, string>) => set({ locNames: names }),
  setFacNames: (names: Record<string, string>) => set({ facNames: names }),

  // ── Lifecycle ──

  init: () => {
    loadVersions();
  },

  destroy: () => {
    resetSaveState();
    set({
      editor: {
        target: null, content: "", isDirty: false,
        lastSavedAt: null, isSaving: false, focusMode: false,
      },
    });
  },
}));
