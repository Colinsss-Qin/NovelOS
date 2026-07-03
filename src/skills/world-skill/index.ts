// ================================================================
// World Skill — 公共 API
// Location · Faction · Lore 三实体 CRUD + Repository 查询
// ================================================================

import { useWorldStore } from "./store";
import type {
  Location, Faction, Lore,
  CreateLocationInput, UpdateLocationInput,
  CreateFactionInput, UpdateFactionInput,
  CreateLoreInput, UpdateLoreInput,
  LocationFilter, FactionFilter, LoreFilter,
  WorldResult, WorldStorageAdapter,
} from "./types";

// ── 重新导出类型 ──
export type {
  Location, Faction, Lore,
  CreateLocationInput, UpdateLocationInput,
  CreateFactionInput, UpdateFactionInput,
  CreateLoreInput, UpdateLoreInput,
  LocationFilter, FactionFilter, LoreFilter,
  WorldResult, WorldStorageAdapter,
  LocationType, FactionType, LoreCategory, EntityStatus,
} from "./types";

export {
  LOCATION_TYPES, FACTION_TYPES, LORE_CATEGORIES, ENTITY_STATUSES,
} from "./types";

export { LocalStorageAdapter } from "./storage";

export {
  getChildLocations, getDescendantLocations, getAncestorChain,
  getTopLevelLocations, buildLocationTree, countLocationsByType,
  getFactionLocations, getLocationFactions,
  getLoresReferencing, getLoreRelatedEntities,
} from "./repository";

// ═══════════════════════════════════
//  Location API
// ═══════════════════════════════════

export function createLocation(input: CreateLocationInput): WorldResult<Location> {
  return useWorldStore.getState().createLocation(input);
}
export function updateLocation(id: string, input: UpdateLocationInput): WorldResult<Location> {
  return useWorldStore.getState().updateLocation(id, input);
}
export function deleteLocation(id: string): WorldResult<null> {
  return useWorldStore.getState().deleteLocation(id);
}
export function getLocation(id: string): WorldResult<Location> {
  return useWorldStore.getState().getLocation(id);
}
export function listLocations(filter: LocationFilter): WorldResult<Location[]> {
  return useWorldStore.getState().listLocations(filter);
}

// ═══════════════════════════════════
//  Faction API
// ═══════════════════════════════════

export function createFaction(input: CreateFactionInput): WorldResult<Faction> {
  return useWorldStore.getState().createFaction(input);
}
export function updateFaction(id: string, input: UpdateFactionInput): WorldResult<Faction> {
  return useWorldStore.getState().updateFaction(id, input);
}
export function deleteFaction(id: string): WorldResult<null> {
  return useWorldStore.getState().deleteFaction(id);
}
export function getFaction(id: string): WorldResult<Faction> {
  return useWorldStore.getState().getFaction(id);
}
export function listFactions(filter: FactionFilter): WorldResult<Faction[]> {
  return useWorldStore.getState().listFactions(filter);
}

// ═══════════════════════════════════
//  Lore API
// ═══════════════════════════════════

export function createLore(input: CreateLoreInput): WorldResult<Lore> {
  return useWorldStore.getState().createLore(input);
}
export function updateLore(id: string, input: UpdateLoreInput): WorldResult<Lore> {
  return useWorldStore.getState().updateLore(id, input);
}
export function deleteLore(id: string): WorldResult<null> {
  return useWorldStore.getState().deleteLore(id);
}
export function getLore(id: string): WorldResult<Lore> {
  return useWorldStore.getState().getLore(id);
}
export function listLores(filter: LoreFilter): WorldResult<Lore[]> {
  return useWorldStore.getState().listLores(filter);
}

// ═══════════════════════════════════
//  配置 API
// ═══════════════════════════════════

export function setStorageAdapter(adapter: WorldStorageAdapter): void {
  useWorldStore.getState().setStorage(adapter);
}

export function loadFromStorage(): void {
  useWorldStore.getState().loadFromStorage();
}

export function subscribe(
  callback: (locs: Location[], facs: Faction[], lores: Lore[]) => void
): () => void {
  return useWorldStore.subscribe((state) => {
    callback(
      Object.values(state.locations),
      Object.values(state.factions),
      Object.values(state.lores)
    );
  });
}
