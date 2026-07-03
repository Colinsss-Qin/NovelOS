// ================================================================
// Character Skill — 关系查询辅助
// ================================================================

import type { CharacterRelation, RelationType } from "./types";

/**
 * 获取两个人之间的所有关系。
 * 关系是无向的（A→B "朋友" 等价于 B→A "朋友"），
 * 但存储时保留方向信息以便区分主动/被动关系。
 */
export function getRelationsBetween(
  relations: readonly CharacterRelation[],
  charIdA: string,
  charIdB: string
): CharacterRelation[] {
  return relations.filter(
    (r) =>
      (r.sourceCharacterId === charIdA && r.targetCharacterId === charIdB) ||
      (r.sourceCharacterId === charIdB && r.targetCharacterId === charIdA)
  );
}

/**
 * 获取某个人物的所有关系（作为 source 或 target）。
 */
export function getCharacterRelations(
  relations: readonly CharacterRelation[],
  characterId: string
): CharacterRelation[] {
  return relations.filter(
    (r) =>
      r.sourceCharacterId === characterId ||
      r.targetCharacterId === characterId
  );
}

/**
 * 按关系类型筛选。
 */
export function filterByType(
  relations: readonly CharacterRelation[],
  type: RelationType
): CharacterRelation[] {
  return relations.filter((r) => r.relationType === type);
}

/**
 * 检查两人物之间是否已存在某种关系类型。
 */
export function hasRelationType(
  relations: readonly CharacterRelation[],
  charIdA: string,
  charIdB: string,
  type: RelationType
): boolean {
  return relations.some(
    (r) =>
      r.relationType === type &&
      ((r.sourceCharacterId === charIdA && r.targetCharacterId === charIdB) ||
        (r.sourceCharacterId === charIdB && r.targetCharacterId === charIdA))
  );
}

/**
 * 获取关系类型的反向映射。
 * "朋友"→"朋友", "师徒"→"师徒", "上下级"→"上下级",
 * "亲属"→"亲属", "恋人"→"恋人", "敌人"→"敌人",
 * "同事"→"同事", "组织成员"→"组织成员"
 * 所有关系类型都是对称的。
 */
export function reciprocalType(type: RelationType): RelationType {
  return type; // 在当前定义中，全部关系类型都是对称的
}

/**
 * 获取某个人物的关系图谱（以该人物为中心的所有关系及关联人物 ID）。
 */
export function getRelationGraph(
  relations: readonly CharacterRelation[],
  characterId: string
): { relation: CharacterRelation; otherCharacterId: string }[] {
  return getCharacterRelations(relations, characterId).map((r) => ({
    relation: r,
    otherCharacterId:
      r.sourceCharacterId === characterId
        ? r.targetCharacterId
        : r.sourceCharacterId,
  }));
}
