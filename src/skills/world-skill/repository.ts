// ================================================================
// World Skill — Repository 层
// 复杂跨实体查询，封装 store 访问模式
// ================================================================

import { useWorldStore } from "./store";
import type { Location, Faction, Lore, LocationType } from "./types";

// ═══════════════════════════════════
//  Location tree queries
// ═══════════════════════════════════

/** 获取地点的直接子地点 */
export function getChildLocations(parentId: string): Location[] {
  const all = Object.values(useWorldStore.getState().locations);
  return all.filter((l) => l.parentLocationId === parentId);
}

/** 获取地点的所有后代（递归） */
export function getDescendantLocations(rootId: string): Location[] {
  const all = Object.values(useWorldStore.getState().locations);
  const result: Location[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    const children = all.filter((l) => l.parentLocationId === pid);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

/** 获取地点的祖先链（从根到自身） */
export function getAncestorChain(locationId: string): Location[] {
  const locations = useWorldStore.getState().locations;
  const chain: Location[] = [];
  let current: Location | undefined = locations[locationId];
  while (current) {
    chain.unshift(current);
    current = current.parentLocationId ? locations[current.parentLocationId] : undefined;
  }
  return chain;
}

/** 获取顶级地点（无父级的） */
export function getTopLevelLocations(projectId: string): Location[] {
  return Object.values(useWorldStore.getState().locations).filter(
    (l) => l.projectId === projectId && !l.parentLocationId
  );
}

/** 构建地点树结构 */
export interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
}

export function buildLocationTree(projectId: string): LocationTreeNode[] {
  const all = Object.values(useWorldStore.getState().locations)
    .filter((l) => l.projectId === projectId);

  function buildChildren(parentId: string): LocationTreeNode[] {
    return all
      .filter((l) => l.parentLocationId === parentId)
      .map((l) => ({ location: l, children: buildChildren(l.id) }));
  }

  return buildChildren("");
}

/** 按类型统计地点数量 */
export function countLocationsByType(projectId: string): Record<LocationType, number> {
  const counts: Record<string, number> = {};
  for (const l of Object.values(useWorldStore.getState().locations)) {
    if (l.projectId !== projectId) continue;
    counts[l.type] = (counts[l.type] || 0) + 1;
  }
  return counts as Record<LocationType, number>;
}

// ═══════════════════════════════════
//  Faction ↔ Location 关联查询
// ═══════════════════════════════════

/** 获取势力控制的所有地点 */
export function getFactionLocations(factionId: string): Location[] {
  const faction = useWorldStore.getState().factions[factionId];
  if (!faction) return [];
  const locations = useWorldStore.getState().locations;
  return faction.locationIds.map((id) => locations[id]).filter(Boolean);
}

/** 获取某个地点上的所有势力 */
export function getLocationFactions(locationId: string): Faction[] {
  return Object.values(useWorldStore.getState().factions).filter(
    (f) => f.locationIds.includes(locationId)
  );
}

// ═══════════════════════════════════
//  Lore 关联查询
// ═══════════════════════════════════

/** 获取引用了某个实体的所有 Lore 条目 */
export function getLoresReferencing(entityId: string): Lore[] {
  return Object.values(useWorldStore.getState().lores).filter(
    (l) => l.relatedEntityIds.includes(entityId)
  );
}

/** 获取某个 Lore 条目关联的所有 Location/Faction */
export function getLoreRelatedEntities(loreId: string): {
  locations: Location[];
  factions: Faction[];
} {
  const lore = useWorldStore.getState().lores[loreId];
  if (!lore) return { locations: [], factions: [] };
  const locs = useWorldStore.getState().locations;
  const facs = useWorldStore.getState().factions;
  return {
    locations: lore.relatedEntityIds.map((id) => locs[id]).filter(Boolean),
    factions: lore.relatedEntityIds.map((id) => facs[id]).filter(Boolean),
  };
}
