// ================================================================
// Outline Skill — Repository 层
// 树结构构建 + 跨层级查询 + 实体引用解析
// ================================================================

import { useOutlineStore } from "./store";
import type { Story, Volume, Chapter, Scene, StoryTreeNode, ChapterTreeNode } from "./types";

// ═══════════════════════════════════
//  Tree builders
// ═══════════════════════════════════

/** 构建完整的故事树（Story → Volume → Chapter → Scene） */
export function buildStoryTree(storyId: string): StoryTreeNode | null {
  const story = useOutlineStore.getState().stories[storyId];
  if (!story) return null;

  const volumes = Object.values(useOutlineStore.getState().volumes)
    .filter(v => v.storyId === storyId)
    .sort((a, b) => a.order - b.order);

  const chapters = Object.values(useOutlineStore.getState().chapters);
  const scenes = Object.values(useOutlineStore.getState().scenes);

  const volumeNodes: ChapterTreeNode[] = volumes.map(vol => {
    const chs = chapters
      .filter(c => c.volumeId === vol.id)
      .sort((a, b) => a.order - b.order)
      .map(ch => ({
        ...ch,
        scenes: scenes.filter(s => s.chapterId === ch.id).sort((a, b) => a.order - b.order),
      }));
    return { volume: vol, chapters: chs };
  });

  return { story, volumes: volumeNodes };
}

/** 获取某章的完整上下文（含所属卷和故事） */
export function getChapterContext(chapterId: string): {
  chapter: Chapter | null;
  volume: Volume | null;
  story: Story | null;
} {
  const state = useOutlineStore.getState();
  const chapter = state.chapters[chapterId] ?? null;
  const volume = chapter ? state.volumes[chapter.volumeId] ?? null : null;
  const story = volume ? state.stories[volume.storyId] ?? null : null;
  return { chapter, volume, story };
}

/** 获取某场景的完整上下文 */
export function getSceneContext(sceneId: string): {
  scene: Scene | null;
  chapter: Chapter | null;
  volume: Volume | null;
  story: Story | null;
} {
  const state = useOutlineStore.getState();
  const scene = state.scenes[sceneId] ?? null;
  const chapter = scene ? state.chapters[scene.chapterId] ?? null : null;
  const volume = chapter ? state.volumes[chapter.volumeId] ?? null : null;
  const story = volume ? state.stories[volume.storyId] ?? null : null;
  return { scene, chapter, volume, story };
}

// ═══════════════════════════════════
//  Statistics
// ═══════════════════════════════════

/** 统计故事的字数、章节数、场景数 */
export function getStoryStats(storyId: string): {
  volumes: number; chapters: number; scenes: number;
  completedChapters: number; writingChapters: number; draftChapters: number;
} {
  const state = useOutlineStore.getState();
  const vols = Object.values(state.volumes).filter(v => v.storyId === storyId);
  const chs = Object.values(state.chapters).filter(c => vols.some(v => v.id === c.volumeId));
  const scs = Object.values(state.scenes).filter(s => chs.some(c => c.id === s.chapterId));
  return {
    volumes: vols.length,
    chapters: chs.length,
    scenes: scs.length,
    completedChapters: chs.filter(c => c.status === "完成").length,
    writingChapters: chs.filter(c => c.status === "写作中").length,
    draftChapters: chs.filter(c => c.status === "未开始").length,
  };
}

// ═══════════════════════════════════
//  Cross-entity lookup (for Character/World Skill integration)
// ═══════════════════════════════════

/** 获取所有引用了某个角色的场景 */
export function getScenesByCharacter(characterId: string): Scene[] {
  return Object.values(useOutlineStore.getState().scenes)
    .filter(s => s.characterIds.includes(characterId));
}

/** 获取所有引用了某个地点的场景 */
export function getScenesByLocation(locationId: string): Scene[] {
  return Object.values(useOutlineStore.getState().scenes)
    .filter(s => s.locationIds.includes(locationId));
}

/** 获取所有引用了某个势力的场景 */
export function getScenesByFaction(factionId: string): Scene[] {
  return Object.values(useOutlineStore.getState().scenes)
    .filter(s => s.factionIds.includes(factionId));
}
