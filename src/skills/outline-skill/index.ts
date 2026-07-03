// ================================================================
// Outline Skill — 公共 API
// Story → Volume → Chapter → Scene + reorder + tree
// ================================================================

import { useOutlineStore } from "./store";
import type {
  Story, Volume, Chapter, Scene,
  CreateStoryInput, UpdateStoryInput,
  CreateVolumeInput, UpdateVolumeInput,
  CreateChapterInput, UpdateChapterInput,
  CreateSceneInput, UpdateSceneInput,
  ReorderInput,
  VolumeFilter, ChapterFilter, SceneFilter,
  OutlineResult, OutlineStorageAdapter,
} from "./types";

// ── 类型导出 ──
export type {
  Story, Volume, Chapter, Scene,
  CreateStoryInput, UpdateStoryInput,
  CreateVolumeInput, UpdateVolumeInput,
  CreateChapterInput, UpdateChapterInput,
  CreateSceneInput, UpdateSceneInput,
  ReorderInput,
  VolumeFilter, ChapterFilter, SceneFilter,
  OutlineResult, OutlineStorageAdapter,
  StoryTreeNode, ChapterTreeNode,
  StoryGenre, ChapterStatus,
} from "./types";

export { CHAPTER_STATUSES, STORY_GENRES } from "./types";
export { LocalStorageAdapter } from "./storage";

export {
  buildStoryTree, getChapterContext, getSceneContext,
  getStoryStats, getScenesByCharacter, getScenesByLocation, getScenesByFaction,
} from "./repository";

// ═══ Story ═══
export function createStory(input: CreateStoryInput): OutlineResult<Story> {
  return useOutlineStore.getState().createStory(input);
}
export function updateStory(id: string, input: UpdateStoryInput): OutlineResult<Story> {
  return useOutlineStore.getState().updateStory(id, input);
}
export function deleteStory(id: string): OutlineResult<null> {
  return useOutlineStore.getState().deleteStory(id);
}
export function getStory(id: string): OutlineResult<Story> {
  return useOutlineStore.getState().getStory(id);
}
export function listStories(projectId: string): OutlineResult<Story[]> {
  return useOutlineStore.getState().listStories(projectId);
}

// ═══ Volume ═══
export function createVolume(input: CreateVolumeInput): OutlineResult<Volume> {
  return useOutlineStore.getState().createVolume(input);
}
export function updateVolume(id: string, input: UpdateVolumeInput): OutlineResult<Volume> {
  return useOutlineStore.getState().updateVolume(id, input);
}
export function deleteVolume(id: string): OutlineResult<null> {
  return useOutlineStore.getState().deleteVolume(id);
}
export function getVolume(id: string): OutlineResult<Volume> {
  return useOutlineStore.getState().getVolume(id);
}
export function listVolumes(filter: VolumeFilter): OutlineResult<Volume[]> {
  return useOutlineStore.getState().listVolumes(filter);
}
export function reorderVolume(input: ReorderInput): OutlineResult<Volume> {
  return useOutlineStore.getState().reorderVolume(input);
}

// ═══ Chapter ═══
export function createChapter(input: CreateChapterInput): OutlineResult<Chapter> {
  return useOutlineStore.getState().createChapter(input);
}
export function updateChapter(id: string, input: UpdateChapterInput): OutlineResult<Chapter> {
  return useOutlineStore.getState().updateChapter(id, input);
}
export function deleteChapter(id: string): OutlineResult<null> {
  return useOutlineStore.getState().deleteChapter(id);
}
export function getChapter(id: string): OutlineResult<Chapter> {
  return useOutlineStore.getState().getChapter(id);
}
export function listChapters(filter: ChapterFilter): OutlineResult<Chapter[]> {
  return useOutlineStore.getState().listChapters(filter);
}
export function reorderChapter(input: ReorderInput): OutlineResult<Chapter> {
  return useOutlineStore.getState().reorderChapter(input);
}

// ═══ Scene ═══
export function createScene(input: CreateSceneInput): OutlineResult<Scene> {
  return useOutlineStore.getState().createScene(input);
}
export function updateScene(id: string, input: UpdateSceneInput): OutlineResult<Scene> {
  return useOutlineStore.getState().updateScene(id, input);
}
export function deleteScene(id: string): OutlineResult<null> {
  return useOutlineStore.getState().deleteScene(id);
}
export function getScene(id: string): OutlineResult<Scene> {
  return useOutlineStore.getState().getScene(id);
}
export function listScenes(filter: SceneFilter): OutlineResult<Scene[]> {
  return useOutlineStore.getState().listScenes(filter);
}
export function reorderScene(input: ReorderInput): OutlineResult<Scene> {
  return useOutlineStore.getState().reorderScene(input);
}

// ═══ 配置 ═══
export function setStorageAdapter(adapter: OutlineStorageAdapter): void {
  useOutlineStore.getState().setStorage(adapter);
}
export function loadFromStorage(): void {
  useOutlineStore.getState().loadFromStorage();
}
export function subscribe(
  callback: (s: Story[], v: Volume[], c: Chapter[], sc: Scene[]) => void
): () => void {
  return useOutlineStore.subscribe((state) => {
    callback(
      Object.values(state.stories), Object.values(state.volumes),
      Object.values(state.chapters), Object.values(state.scenes)
    );
  });
}
