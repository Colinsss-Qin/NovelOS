// ================================================================
// World Skill — Zustand Store（严格类型，零 any）
// Location · Faction · Lore 三实体统一管理
// ================================================================

import { create } from "zustand";
import type {
  Location, Faction, Lore,
  CreateLocationInput, UpdateLocationInput,
  CreateFactionInput, UpdateFactionInput,
  CreateLoreInput, UpdateLoreInput,
  LocationFilter, FactionFilter, LoreFilter,
  WorldResult, WorldStorageAdapter, IdGenerator,
} from "./types";
import {
  validateCreateLocation, validateUpdateLocation,
  validateCreateFaction, validateUpdateFaction,
  validateCreateLore, validateUpdateLore,
} from "./validation";

// ── 默认实现 ──

const defaultIdGenerator: IdGenerator = () => {
  return "world_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
};

class MemoryStorageAdapter implements WorldStorageAdapter {
  private locs: Location[] = [];
  private facs: Faction[] = [];
  private lores: Lore[] = [];
  loadLocations() { return this.locs; }
  saveLocations(l: readonly Location[]) { this.locs = [...l]; }
  loadFactions() { return this.facs; }
  saveFactions(f: readonly Faction[]) { this.facs = [...f]; }
  loadLores() { return this.lores; }
  saveLores(l: readonly Lore[]) { this.lores = [...l]; }
}

// ── Store State ──

interface WorldStoreState {
  locations: Record<string, Location>;
  factions: Record<string, Faction>;
  lores: Record<string, Lore>;
  idGenerator: IdGenerator;
  storage: WorldStorageAdapter;
}

// ── Store Actions ──

interface WorldStoreActions {
  setStorage: (a: WorldStorageAdapter) => void;
  loadFromStorage: () => void;

  // Location CRUD
  createLocation: (input: CreateLocationInput) => WorldResult<Location>;
  updateLocation: (id: string, input: UpdateLocationInput) => WorldResult<Location>;
  deleteLocation: (id: string) => WorldResult<null>;
  getLocation: (id: string) => WorldResult<Location>;
  listLocations: (filter: LocationFilter) => WorldResult<Location[]>;

  // Faction CRUD
  createFaction: (input: CreateFactionInput) => WorldResult<Faction>;
  updateFaction: (id: string, input: UpdateFactionInput) => WorldResult<Faction>;
  deleteFaction: (id: string) => WorldResult<null>;
  getFaction: (id: string) => WorldResult<Faction>;
  listFactions: (filter: FactionFilter) => WorldResult<Faction[]>;

  // Lore CRUD
  createLore: (input: CreateLoreInput) => WorldResult<Lore>;
  updateLore: (id: string, input: UpdateLoreInput) => WorldResult<Lore>;
  deleteLore: (id: string) => WorldResult<null>;
  getLore: (id: string) => WorldResult<Lore>;
  listLores: (filter: LoreFilter) => WorldResult<Lore[]>;
}

type WorldStore = WorldStoreState & WorldStoreActions;

// ── 辅助构建函数 ──

function buildLocation(input: CreateLocationInput, id: string): Location {
  const now = new Date().toISOString();
  return {
    id, projectId: input.projectId.trim(), name: input.name.trim(),
    type: input.type ?? "其他", description: input.description?.trim() ?? "",
    parentLocationId: input.parentLocationId?.trim() ?? "",
    climate: input.climate?.trim() ?? "", resources: input.resources?.trim() ?? "",
    population: input.population ?? 0,
    tags: Object.freeze([...(input.tags ?? [])]),
    status: "active", notes: input.notes?.trim() ?? "",
    createdAt: now, updatedAt: now,
  };
}

function buildFaction(input: CreateFactionInput, id: string): Faction {
  const now = new Date().toISOString();
  return {
    id, projectId: input.projectId.trim(), name: input.name.trim(),
    type: input.type ?? "其他", leader: input.leader?.trim() ?? "",
    description: input.description?.trim() ?? "", goal: input.goal?.trim() ?? "",
    influence: input.influence ?? 0,
    memberIds: Object.freeze([...(input.memberIds ?? [])]),
    locationIds: Object.freeze([...(input.locationIds ?? [])]),
    tags: Object.freeze([...(input.tags ?? [])]),
    status: "active", createdAt: now, updatedAt: now,
  };
}

function buildLore(input: CreateLoreInput, id: string): Lore {
  const now = new Date().toISOString();
  return {
    id, projectId: input.projectId.trim(), title: input.title.trim(),
    category: input.category ?? "其他", content: input.content?.trim() ?? "",
    tags: Object.freeze([...(input.tags ?? [])]),
    relatedEntityIds: Object.freeze([...(input.relatedEntityIds ?? [])]),
    status: "active", createdAt: now, updatedAt: now,
  };
}

// ═══════════════════════════════════════
//  Zustand Store
// ═══════════════════════════════════════

export const useWorldStore = create<WorldStore>()((set, get) => ({
  locations: {}, factions: {}, lores: {},
  idGenerator: defaultIdGenerator,
  storage: new MemoryStorageAdapter(),

  setStorage: (a) => set({ storage: a }),
  loadFromStorage: () => {
    const s = get().storage;
    const locs: Record<string, Location> = {};
    for (const l of s.loadLocations()) locs[l.id] = l;
    const facs: Record<string, Faction> = {};
    for (const f of s.loadFactions()) facs[f.id] = f;
    const lrs: Record<string, Lore> = {};
    for (const l of s.loadLores()) lrs[l.id] = l;
    set({ locations: locs, factions: facs, lores: lrs });
  },

  // ── Location CRUD ──

  createLocation: (input) => {
    const errs = validateCreateLocation(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const id = get().idGenerator();
    const loc = buildLocation(input, id);
    set(s => ({ locations: { ...s.locations, [id]: loc } }));
    get().storage.saveLocations(Object.values(get().locations));
    return { success: true, data: loc };
  },

  updateLocation: (id, input) => {
    const existing = get().locations[id];
    if (!existing) return { success: false, error: `地点不存在: ${id}` };
    const errs = validateUpdateLocation(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Location = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      type: input.type ?? existing.type,
      description: input.description?.trim() ?? existing.description,
      parentLocationId: input.parentLocationId?.trim() ?? existing.parentLocationId,
      climate: input.climate?.trim() ?? existing.climate,
      resources: input.resources?.trim() ?? existing.resources,
      population: input.population ?? existing.population,
      tags: input.tags !== undefined ? Object.freeze([...input.tags]) : existing.tags,
      status: input.status ?? existing.status,
      notes: input.notes?.trim() ?? existing.notes,
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ locations: { ...s.locations, [id]: updated } }));
    get().storage.saveLocations(Object.values(get().locations));
    return { success: true, data: updated };
  },

  deleteLocation: (id) => {
    if (!get().locations[id]) return { success: false, error: `地点不存在: ${id}` };
    // Cascade: clear parentLocationId references
    const updated: Record<string, Location> = {};
    for (const [k, v] of Object.entries(get().locations)) {
      if (k === id) continue;
      updated[k] = v.parentLocationId === id ? { ...v, parentLocationId: "", updatedAt: new Date().toISOString() } : v;
    }
    set({ locations: updated });
    get().storage.saveLocations(Object.values(get().locations));
    return { success: true, data: null };
  },

  getLocation: (id) => {
    const l = get().locations[id];
    return l ? { success: true, data: l } : { success: false, error: `地点不存在: ${id}` };
  },

  listLocations: (filter) => {
    let list = Object.values(get().locations).filter(l => l.projectId === filter.projectId);
    if (filter.type) list = list.filter(l => l.type === filter.type);
    if (filter.parentLocationId !== undefined) list = list.filter(l => l.parentLocationId === filter.parentLocationId);
    if (filter.status) list = list.filter(l => l.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { success: true, data: list };
  },

  // ── Faction CRUD ──

  createFaction: (input) => {
    const errs = validateCreateFaction(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const id = get().idGenerator();
    const fac = buildFaction(input, id);
    set(s => ({ factions: { ...s.factions, [id]: fac } }));
    get().storage.saveFactions(Object.values(get().factions));
    return { success: true, data: fac };
  },

  updateFaction: (id, input) => {
    const existing = get().factions[id];
    if (!existing) return { success: false, error: `势力不存在: ${id}` };
    const errs = validateUpdateFaction(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Faction = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      type: input.type ?? existing.type,
      leader: input.leader?.trim() ?? existing.leader,
      description: input.description?.trim() ?? existing.description,
      goal: input.goal?.trim() ?? existing.goal,
      influence: input.influence ?? existing.influence,
      memberIds: input.memberIds !== undefined ? Object.freeze([...input.memberIds]) : existing.memberIds,
      locationIds: input.locationIds !== undefined ? Object.freeze([...input.locationIds]) : existing.locationIds,
      tags: input.tags !== undefined ? Object.freeze([...input.tags]) : existing.tags,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ factions: { ...s.factions, [id]: updated } }));
    get().storage.saveFactions(Object.values(get().factions));
    return { success: true, data: updated };
  },

  deleteFaction: (id) => {
    if (!get().factions[id]) return { success: false, error: `势力不存在: ${id}` };
    const { [id]: _, ...rest } = get().factions;
    set({ factions: rest });
    get().storage.saveFactions(Object.values(get().factions));
    return { success: true, data: null };
  },

  getFaction: (id) => {
    const f = get().factions[id];
    return f ? { success: true, data: f } : { success: false, error: `势力不存在: ${id}` };
  },

  listFactions: (filter) => {
    let list = Object.values(get().factions).filter(f => f.projectId === filter.projectId);
    if (filter.type) list = list.filter(f => f.type === filter.type);
    if (filter.status) list = list.filter(f => f.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { success: true, data: list };
  },

  // ── Lore CRUD ──

  createLore: (input) => {
    const errs = validateCreateLore(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const id = get().idGenerator();
    const lore = buildLore(input, id);
    set(s => ({ lores: { ...s.lores, [id]: lore } }));
    get().storage.saveLores(Object.values(get().lores));
    return { success: true, data: lore };
  },

  updateLore: (id, input) => {
    const existing = get().lores[id];
    if (!existing) return { success: false, error: `知识条目不存在: ${id}` };
    const errs = validateUpdateLore(input);
    if (errs.length > 0) return { success: false, error: errs.map(e => e.message).join("; ") };
    const updated: Lore = {
      ...existing,
      title: input.title?.trim() ?? existing.title,
      category: input.category ?? existing.category,
      content: input.content?.trim() ?? existing.content,
      tags: input.tags !== undefined ? Object.freeze([...input.tags]) : existing.tags,
      relatedEntityIds: input.relatedEntityIds !== undefined ? Object.freeze([...input.relatedEntityIds]) : existing.relatedEntityIds,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ lores: { ...s.lores, [id]: updated } }));
    get().storage.saveLores(Object.values(get().lores));
    return { success: true, data: updated };
  },

  deleteLore: (id) => {
    if (!get().lores[id]) return { success: false, error: `知识条目不存在: ${id}` };
    const { [id]: _, ...rest } = get().lores;
    set({ lores: rest });
    get().storage.saveLores(Object.values(get().lores));
    return { success: true, data: null };
  },

  getLore: (id) => {
    const l = get().lores[id];
    return l ? { success: true, data: l } : { success: false, error: `知识条目不存在: ${id}` };
  },

  listLores: (filter) => {
    let list = Object.values(get().lores).filter(l => l.projectId === filter.projectId);
    if (filter.category) list = list.filter(l => l.category === filter.category);
    if (filter.status) list = list.filter(l => l.status === filter.status);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(l => l.title.toLowerCase().includes(q) || l.content.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { success: true, data: list };
  },
}));
