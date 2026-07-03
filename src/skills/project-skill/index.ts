// ================================================================
// Project Skill — 公共 API
// 提供 createProject / updateProject / deleteProject /
//       archiveProject / getProject / listProjects
// ================================================================

import { useProjectStore } from "./store";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilter,
  ProjectResult,
  ProjectStorageAdapter,
} from "./types";

// ── 重新导出类型（方便外部使用） ──
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilter,
  ProjectResult,
  ProjectStorageAdapter,
  ProjectStatus,
  ProjectGenre,
} from "./types";

// ═══════════════════════════════════════
//  Public API — 函数式接口
// ═══════════════════════════════════════

/** 创建作品 */
export function createProject(
  input: CreateProjectInput
): ProjectResult<Project> {
  return useProjectStore.getState().createProject(input);
}

/** 更新作品（部分字段） */
export function updateProject(
  id: string,
  input: UpdateProjectInput
): ProjectResult<Project> {
  return useProjectStore.getState().updateProject(id, input);
}

/** 删除作品（不可逆） */
export function deleteProject(id: string): ProjectResult<null> {
  return useProjectStore.getState().deleteProject(id);
}

/** 归档作品（状态 → "归档"） */
export function archiveProject(id: string): ProjectResult<Project> {
  return useProjectStore.getState().archiveProject(id);
}

/** 获取单个作品 */
export function getProject(id: string): ProjectResult<Project> {
  return useProjectStore.getState().getProject(id);
}

/** 列出作品（支持按 status/genre/tag/search 过滤） */
export function listProjects(
  filter?: ProjectFilter
): ProjectResult<Project[]> {
  return useProjectStore.getState().listProjects(filter);
}

// ═══════════════════════════════════════
//  配置 API
// ═══════════════════════════════════════

/** 设置持久化适配器（默认内存，可切换为 localStorage / Prisma） */
export function setStorageAdapter(adapter: ProjectStorageAdapter): void {
  useProjectStore.getState().setStorage(adapter);
}

/** 从存储加载全部数据到 store */
export function loadProjects(): void {
  useProjectStore.getState().loadFromStorage();
}

/** 订阅 store 变化（用于前端响应式更新） */
export function subscribe(callback: (projects: Project[]) => void): () => void {
  return useProjectStore.subscribe((state) => {
    callback(Object.values(state.projects));
  });
}

/** 获取当前全部项目快照（不产生订阅） */
export function getSnapshot(): Project[] {
  return Object.values(useProjectStore.getState().projects);
}
