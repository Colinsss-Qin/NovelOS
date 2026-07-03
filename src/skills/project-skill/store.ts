// ================================================================
// Project Skill — Zustand Store（严格类型，零 any）
// ================================================================

import { create, type StoreApi } from "zustand";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilter,
  ProjectResult,
  ProjectStorageAdapter,
  IdGenerator,
} from "./types";

// ── 默认 ID 生成器 ──
const defaultIdGenerator: IdGenerator = () => {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `proj_${t}_${r}`;
};

// ── 默认存储适配器（内存） ──
class MemoryStorageAdapter implements ProjectStorageAdapter {
  private data: Project[] = [];

  load(): Project[] {
    return this.data;
  }

  save(projects: readonly Project[]): void {
    this.data = [...projects];
  }
}

// ── Store State ──
interface ProjectStoreState {
  projects: Record<string, Project>; // id → Project，O(1) 查找
  idGenerator: IdGenerator;
  storage: ProjectStorageAdapter;
}

// ── Store Actions ──
interface ProjectStoreActions {
  /** 设置持久化适配器 */
  setStorage: (adapter: ProjectStorageAdapter) => void;

  /** 设置 ID 生成器 */
  setIdGenerator: (gen: IdGenerator) => void;

  /** 从存储加载全部项目 */
  loadFromStorage: () => void;

  // ── CRUD ──

  createProject: (input: CreateProjectInput) => ProjectResult<Project>;

  updateProject: (
    id: string,
    input: UpdateProjectInput
  ) => ProjectResult<Project>;

  deleteProject: (id: string) => ProjectResult<null>;

  archiveProject: (id: string) => ProjectResult<Project>;

  // ── 查询 ──

  getProject: (id: string) => ProjectResult<Project>;

  listProjects: (filter?: ProjectFilter) => ProjectResult<Project[]>;
}

type ProjectStore = ProjectStoreState & ProjectStoreActions;

// ── 辅助：创建完整 Project ──
function buildProject(
  input: CreateProjectInput,
  idGen: IdGenerator
): Project {
  const now = new Date().toISOString();
  return {
    id: idGen(),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() ?? "",
    genre: input.genre ?? "其他",
    tags: Object.freeze([...(input.tags ?? [])]),
    description: input.description?.trim() ?? "",
    cover: input.cover ?? "",
    status: "筹备中",
    targetWords: input.targetWords ?? 0,
    currentWords: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ── 辅助：保存到适配器 ──
function persist(state: ProjectStoreState): void {
  state.storage.save(Object.values(state.projects));
}

// ═══════════════════════════════════════
//  Zustand Store
// ═══════════════════════════════════════

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  // ── State ──
  projects: {},
  idGenerator: defaultIdGenerator,
  storage: new MemoryStorageAdapter(),

  // ── 配置 ──

  setStorage: (adapter: ProjectStorageAdapter) => {
    set({ storage: adapter });
  },

  setIdGenerator: (gen: IdGenerator) => {
    set({ idGenerator: gen });
  },

  loadFromStorage: () => {
    const { storage } = get();
    const loaded = storage.load();
    const map: Record<string, Project> = {};
    for (const p of loaded) {
      map[p.id] = p;
    }
    set({ projects: map });
  },

  // ── CRUD ──

  createProject: (input: CreateProjectInput): ProjectResult<Project> => {
    if (!input.title || !input.title.trim()) {
      return { success: false, error: "作品标题不能为空" };
    }

    const { idGenerator, projects } = get();
    const project = buildProject(input, idGenerator);

    set({
      projects: { ...projects, [project.id]: project },
    });

    persist(get());
    return { success: true, data: project };
  },

  updateProject: (
    id: string,
    input: UpdateProjectInput
  ): ProjectResult<Project> => {
    const { projects } = get();
    const existing = projects[id];

    if (!existing) {
      return { success: false, error: `作品不存在: ${id}` };
    }

    if (existing.status === "归档" && input.status !== "归档") {
      // 更新归档作品的其他字段是允许的，但改变状态需要先取消归档
    }

    const updated: Project = {
      ...existing,
      title: input.title?.trim() ?? existing.title,
      subtitle: input.subtitle?.trim() ?? existing.subtitle,
      genre: input.genre ?? existing.genre,
      tags:
        input.tags !== undefined
          ? Object.freeze([...input.tags])
          : existing.tags,
      description: input.description?.trim() ?? existing.description,
      cover: input.cover ?? existing.cover,
      status: input.status ?? existing.status,
      targetWords: input.targetWords ?? existing.targetWords,
      currentWords: input.currentWords ?? existing.currentWords,
      updatedAt: new Date().toISOString(),
    };

    set({
      projects: { ...projects, [id]: updated },
    });

    persist(get());
    return { success: true, data: updated };
  },

  deleteProject: (id: string): ProjectResult<null> => {
    const { projects } = get();
    const existing = projects[id];

    if (!existing) {
      return { success: false, error: `作品不存在: ${id}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [id]: _removed, ...rest } = projects;
    set({ projects: rest });

    persist(get());
    return { success: true, data: null };
  },

  archiveProject: (id: string): ProjectResult<Project> => {
    const { projects } = get();
    const existing = projects[id];

    if (!existing) {
      return { success: false, error: `作品不存在: ${id}` };
    }

    if (existing.status === "归档") {
      return { success: false, error: "作品已归档" };
    }

    const archived: Project = {
      ...existing,
      status: "归档",
      updatedAt: new Date().toISOString(),
    };

    set({
      projects: { ...projects, [id]: archived },
    });

    persist(get());
    return { success: true, data: archived };
  },

  // ── 查询 ──

  getProject: (id: string): ProjectResult<Project> => {
    const project = get().projects[id];
    if (!project) {
      return { success: false, error: `作品不存在: ${id}` };
    }
    return { success: true, data: project };
  },

  listProjects: (filter?: ProjectFilter): ProjectResult<Project[]> => {
    let list = Object.values(get().projects);

    if (filter) {
      if (filter.status) {
        list = list.filter((p) => p.status === filter.status);
      }
      if (filter.genre) {
        list = list.filter((p) => p.genre === filter.genre);
      }
      if (filter.tag) {
        const tag = filter.tag.toLowerCase();
        list = list.filter((p) =>
          p.tags.some((t) => t.toLowerCase() === tag)
        );
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.subtitle.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
      }
    }

    // 默认排序：updatedAt 倒序
    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return { success: true, data: list };
  },
}));

// ── 导出辅助类型 ──
export type { ProjectStore };
