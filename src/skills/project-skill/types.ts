// ================================================================
// Project Skill — 类型定义（严格模式，零 any）
// ================================================================

/** 作品状态 */
export type ProjectStatus = "筹备中" | "创作中" | "完结" | "归档";

/** 作品分类 */
export type ProjectGenre =
  | "奇幻"
  | "科幻"
  | "武侠"
  | "都市"
  | "历史"
  | "悬疑"
  | "言情"
  | "恐怖"
  | "其他";

/** 作品核心数据 */
export interface Project {
  readonly id: string;
  title: string;
  subtitle: string;
  genre: ProjectGenre;
  tags: readonly string[];
  description: string;
  cover: string;
  status: ProjectStatus;
  targetWords: number;
  currentWords: number;
  readonly createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 创建作品的输入（id 自动生成） */
export interface CreateProjectInput {
  title: string;
  subtitle?: string;
  genre?: ProjectGenre;
  tags?: string[];
  description?: string;
  cover?: string;
  targetWords?: number;
}

/** 更新作品的输入（所有字段可选） */
export interface UpdateProjectInput {
  title?: string;
  subtitle?: string;
  genre?: ProjectGenre;
  tags?: string[];
  description?: string;
  cover?: string;
  status?: ProjectStatus;
  targetWords?: number;
  currentWords?: number;
}

/** 查询过滤条件 */
export interface ProjectFilter {
  status?: ProjectStatus;
  genre?: ProjectGenre;
  tag?: string;
  search?: string; // 模糊匹配 title / subtitle / description
}

/** 操作结果（统一返回类型） */
export type ProjectResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** 持久化适配器接口 */
export interface ProjectStorageAdapter {
  load(): Project[];
  save(projects: readonly Project[]): void;
}

/** 生成唯一 ID 的函数类型 */
export type IdGenerator = () => string;
