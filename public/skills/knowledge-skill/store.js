/* ================================================================
   Knowledge Skill / Store
   In-memory data store for KnowledgeItems.
   Frontend mode: wraps existing novelData into unified format.
   Future backend mode: delegates to Prisma via REST API.
   ================================================================ */

// ================================================================
//  INTERNAL STORE
// ================================================================
var _store = {
  items: {},    // id → KnowledgeItem
  index: {      // projectId → type → [id, ...]
    // "proj_1": { "character": ["id1","id2"], "faction": [...] }
  }
};

// Simple incremental ID counter
var _idCounter = 0;

function _nextId(type) {
  _idCounter++;
  return type + "_" + _idCounter + "_" + Date.now().toString(36);
}

// ================================================================
//  FACTORY — create a KnowledgeItem with defaults
// ================================================================

/**
 * Create a KnowledgeItem object.
 * @param {object} opts
 * @param {string} opts.projectId
 * @param {string} opts.type — KnowledgeType value
 * @param {string} opts.name
 * @param {string} [opts.id] — use this if provided, otherwise auto-generate
 * @param {string[]} [opts.aliases]
 * @param {string} [opts.summary]
 * @param {string} [opts.description]
 * @param {string[]} [opts.tags]
 * @param {object} [opts.attrs] — type-specific attrs
 * @returns {object} KnowledgeItem
 */
function createItem(opts) {
  var now = new Date().toISOString();
  return {
    id:          opts.id || _nextId(opts.type),
    projectId:   opts.projectId,
    type:        opts.type,
    name:        opts.name,
    aliases:     opts.aliases || [],
    summary:     opts.summary || "",
    description: opts.description || "",
    tags:        opts.tags || [],
    attrs:       buildAttrs(opts.type, opts.attrs),
    createdAt:   now,
    updatedAt:   now
  };
}

// ================================================================
//  INDEX MAINTENANCE
// ================================================================

function _addToIndex(item) {
  if (!_store.index[item.projectId]) {
    _store.index[item.projectId] = {};
  }
  var pIdx = _store.index[item.projectId];
  if (!pIdx[item.type]) {
    pIdx[item.type] = [];
  }
  if (pIdx[item.type].indexOf(item.id) === -1) {
    pIdx[item.type].push(item.id);
  }
}

function _removeFromIndex(item) {
  var pIdx = _store.index[item.projectId];
  if (!pIdx || !pIdx[item.type]) return;
  var arr = pIdx[item.type];
  var pos = arr.indexOf(item.id);
  if (pos !== -1) arr.splice(pos, 1);
}

// ================================================================
//  CRUD
// ================================================================

/**
 * Insert an item into the store.
 * @param {object} item — KnowledgeItem
 */
function insert(item) {
  _store.items[item.id] = item;
  _addToIndex(item);
  return item;
}

/**
 * Get item by id.
 * @param {string} id
 * @returns {object|undefined}
 */
function getById(id) {
  return _store.items[id];
}

/**
 * Query items by projectId and optional type filter.
 * @param {string} projectId
 * @param {string} [type] — KnowledgeType filter
 * @returns {object[]}
 */
function list(projectId, type) {
  var pIdx = _store.index[projectId];
  if (!pIdx) return [];

  if (type) {
    return (pIdx[type] || []).map(function (id) { return _store.items[id]; }).filter(Boolean);
  }

  // All types
  var all = [];
  Object.keys(pIdx).forEach(function (t) {
    (pIdx[t] || []).forEach(function (id) {
      var item = _store.items[id];
      if (item) all.push(item);
    });
  });
  return all;
}

/**
 * Update an item partially.
 * @param {string} id
 * @param {object} patch — { name?, summary?, description?, tags?, attrs? }
 * @returns {object|undefined}
 */
function update(id, patch) {
  var item = _store.items[id];
  if (!item) return undefined;

  if (patch.name !== undefined)        item.name = patch.name;
  if (patch.summary !== undefined)     item.summary = patch.summary;
  if (patch.description !== undefined) item.description = patch.description;
  if (patch.tags !== undefined)        item.tags = patch.tags;
  if (patch.aliases !== undefined)     item.aliases = patch.aliases;
  if (patch.attrs !== undefined) {
    // Merge attrs
    var merged = {};
    Object.keys(item.attrs).forEach(function (k) { merged[k] = item.attrs[k]; });
    Object.keys(patch.attrs).forEach(function (k) { merged[k] = patch.attrs[k]; });
    item.attrs = merged;
  }
  item.updatedAt = new Date().toISOString();
  return item;
}

/**
 * Delete an item and remove from index.
 * @param {string} id
 * @returns {boolean}
 */
function remove(id) {
  var item = _store.items[id];
  if (!item) return false;
  _removeFromIndex(item);
  delete _store.items[id];
  return true;
}

/**
 * Get unique tags across all items in a project.
 * @param {string} projectId
 * @returns {string[]}
 */
function getAllTags(projectId) {
  var items = list(projectId);
  var tagSet = {};
  items.forEach(function (item) {
    (item.tags || []).forEach(function (t) {
      if (t) tagSet[t.trim()] = true;
    });
  });
  return Object.keys(tagSet).sort();
}

// ================================================================
//  ADAPTER — convert existing novelData characters/settings into
//  KnowledgeItem format (bridges old and new data models)
// ================================================================

/**
 * Convert a character from novelData format into a KnowledgeItem.
 * @param {object} ch — { name, role, avatar, desc } from novelData
 * @param {string} projectId
 * @returns {object} KnowledgeItem
 */
function fromNovelCharacter(ch, projectId) {
  return createItem({
    projectId: projectId,
    type: KnowledgeType.CHARACTER,
    name: ch.name,
    aliases: ch.avatar && ch.avatar !== ch.name.charAt(0) ? [ch.avatar] : [],
    summary: ch.desc || "",
    tags: [ch.role === "主角" ? "主角" : ch.role],
    attrs: { role: ch.role, personality: ch.desc || "", status: "active" }
  });
}

/**
 * Convert a setting from novelData format into a KnowledgeItem.
 * @param {object} s — { name, category, desc } from novelData
 * @param {string} projectId
 * @returns {object} KnowledgeItem
 */
function fromNovelSetting(s, projectId) {
  var type = KnowledgeType.RULE; // default
  if (s.category === "地点")   type = KnowledgeType.LOCATION;
  if (s.category === "势力")   type = KnowledgeType.FACTION;
  if (s.category === "规则")   type = KnowledgeType.RULE;
  if (s.category === "妖兽")   type = KnowledgeType.CHARACTER;

  return createItem({
    projectId: projectId,
    type: type,
    name: s.name,
    summary: s.desc || "",
    tags: [s.category],
    attrs: type === KnowledgeType.LOCATION
      ? buildAttrs(KnowledgeType.LOCATION, { locationType: "其他" })
      : type === KnowledgeType.FACTION
        ? buildAttrs(KnowledgeType.FACTION, { factionType: "其他" })
        : type === KnowledgeType.CHARACTER
          ? buildAttrs(KnowledgeType.CHARACTER, { role: "路人" })
          : buildAttrs(KnowledgeType.RULE, { ruleCategory: s.category })
  });
}

/**
 * Seed the store with data extracted from novelData.
 * Extracts unique characters and settings from all chapters.
 * @param {object} novelData — the global novelData variable
 * @param {string} projectId
 * @returns {{ characterCount: number, settingCount: number }}
 */
function seedFromNovelData(novelData, projectId) {
  var seenChars = {};
  var seenSettings = {};
  var charCount = 0, settingCount = 0;

  if (!novelData || !novelData.volumes) return { characterCount: 0, settingCount: 0 };

  novelData.volumes.forEach(function (vol) {
    vol.chapters.forEach(function (ch) {
      // Characters
      (ch.characters || []).forEach(function (c) {
        if (!seenChars[c.name]) {
          seenChars[c.name] = true;
          insert(fromNovelCharacter(c, projectId));
          charCount++;
        }
      });
      // Settings
      (ch.settings || []).forEach(function (s) {
        if (!seenSettings[s.name]) {
          seenSettings[s.name] = true;
          insert(fromNovelSetting(s, projectId));
          settingCount++;
        }
      });
    });
  });

  return { characterCount: charCount, settingCount: settingCount };
}

/**
 * Load items from the backend API and populate the in-memory store.
 * Replaces the demo-data seeding pattern with real database data.
 * @param {string} projectId
 * @returns {Promise<{itemCount: number}>}
 */
function loadFromApi(projectId) {
  return fetch("/api/items?projectId=" + encodeURIComponent(projectId) + "&limit=500")
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success || !result.data || !result.data.items) return { itemCount: 0 };

      var items = result.data.items;
      items.forEach(function (apiItem) {
        // Map API UnifiedItem to KnowledgeItem format
        var item = {
          id: apiItem.id,
          projectId: apiItem.projectId,
          type: apiItem.type,
          name: apiItem.name,
          aliases: apiItem.aliases ? apiItem.aliases.split(",").map(function (s) { return s.trim(); }) : [],
          summary: apiItem.summary || "",
          description: apiItem.description || "",
          tags: apiItem.tags ? apiItem.tags.split(",").map(function (s) { return s.trim(); }) : [],
          attrs: apiItem.attrs || {},
          createdAt: apiItem.createdAt || new Date().toISOString(),
          updatedAt: apiItem.updatedAt || new Date().toISOString(),
        };

        // Insert into store (skip if already exists)
        if (!_store.items[apiItem.id]) {
          _store.items[apiItem.id] = item;
          _addToIndex(item);
        }
      });

      return { itemCount: items.length };
    })
    .catch(function () {
      return { itemCount: 0 };
    });
}
