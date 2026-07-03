/* ================================================================
   Knowledge Skill / Types
   Enumerations, attrs schemas, and validation for all 10 knowledge types.
   ================================================================ */

var KnowledgeType = {
  CHARACTER:     "character",
  FACTION:       "faction",
  NATION:        "nation",
  SECT:          "sect",
  LOCATION:      "location",
  ARTIFACT:      "artifact",
  TECHNIQUE:     "technique",
  RULE:          "rule",
  HISTORY_EVENT: "history_event",
  TIMELINE_NODE: "timeline_node"
};

// Human-readable labels
var KnowledgeTypeLabel = {
  "character":     "角色",
  "faction":       "势力",
  "nation":        "国家",
  "sect":          "宗门",
  "location":      "地点",
  "artifact":      "宝物",
  "technique":     "功法",
  "rule":          "规则体系",
  "history_event": "历史事件",
  "timeline_node": "时间线节点"
};

// ================================================================
//  ATTRS SCHEMAS — required fields + optional fields + defaults
//  Each schema: { required: [...], optional: {...}, defaults: {...} }
// ================================================================

var ATTRS_SCHEMA = {};

// ---- 角色 ----
ATTRS_SCHEMA.character = {
  required: ["role", "personality"],
  optional: {
    gender:     { type: "string", values: ["男","女","其他"] },
    age:        { type: "number", min: 0, max: 9999 },
    appearance: { type: "string" },
    background: { type: "string" },
    arc:        { type: "string" },
    abilities:  { type: "array" },
    status:     { type: "string", values: ["active","deceased","archived"] }
  },
  defaults: {
    role:        "配角",
    personality: "",
    status:      "active"
  }
};

// ---- 势力 ----
ATTRS_SCHEMA.faction = {
  required: ["factionType"],
  optional: {
    influence:  { type: "number", min: 0, max: 100 },
    military:   { type: "number", min: 0, max: 100 },
    economy:    { type: "number", min: 0, max: 100 },
    resources:  { type: "string" }
  },
  defaults: {
    factionType: "其他",
    influence:   0,
    military:    0,
    economy:     0
  }
};

// ---- 国家 ----
ATTRS_SCHEMA.nation = {
  required: [],
  optional: {
    ruler:      { type: "string" },
    capital:    { type: "string" },
    population: { type: "number", min: 0 },
    territory:  { type: "string" },
    influence:  { type: "number", min: 0, max: 100 },
    military:   { type: "number", min: 0, max: 100 },
    economy:    { type: "number", min: 0, max: 100 }
  },
  defaults: { influence: 0, military: 0, economy: 0 }
};

// ---- 宗门 ----
ATTRS_SCHEMA.sect = {
  required: [],
  optional: {
    leader:          { type: "string" },
    headquarters:    { type: "string" },
    discipleTiers:   { type: "array" },
    coreTechniques:  { type: "array" },
    influence:       { type: "number", min: 0, max: 100 },
    military:        { type: "number", min: 0, max: 100 },
    economy:         { type: "number", min: 0, max: 100 }
  },
  defaults: { influence: 0, military: 0, economy: 0 }
};

// ---- 地点 ----
ATTRS_SCHEMA.location = {
  required: ["locationType"],
  optional: {
    parentId:  { type: "string" },
    climate:   { type: "string" },
    resources: { type: "string" }
  },
  defaults: { locationType: "其他" }
};

// ---- 宝物 ----
ATTRS_SCHEMA.artifact = {
  required: ["artifactType"],
  optional: {
    grade:         { type: "string", values: ["凡品","灵品","仙品","神品","未知"] },
    origin:        { type: "string" },
    ownerId:       { type: "string" },
    abilities:     { type: "array" },
    restrictions:  { type: "string" }
  },
  defaults: { artifactType: "其他", grade: "未知" }
};

// ---- 功法 ----
ATTRS_SCHEMA.technique = {
  required: ["techniqueType"],
  optional: {
    grade:          { type: "string" },
    element:        { type: "string", values: ["金","木","水","火","土","风","雷","光","暗","无"] },
    levels:         { type: "number", min: 1 },
    prerequisites:  { type: "string" },
    effect:         { type: "string" },
    creatorId:      { type: "string" }
  },
  defaults: { techniqueType: "其他" }
};

// ---- 规则体系 ----
ATTRS_SCHEMA.rule = {
  required: ["ruleCategory"],
  optional: {},
  defaults: { ruleCategory: "其他" }
};

// ---- 历史事件 ----
ATTRS_SCHEMA.history_event = {
  required: [],
  optional: {
    era:                  { type: "string" },
    involvedCharacterIds: { type: "array" },
    involvedFactionIds:   { type: "array" },
    isAutoExtracted:      { type: "boolean" }
  },
  defaults: { isAutoExtracted: false }
};

// ---- 时间线节点 ----
ATTRS_SCHEMA.timeline_node = {
  required: ["timestamp", "sortOrder"],
  optional: {
    chapterId:  { type: "string" },
    summary:    { type: "string" },
    involvedIds:{ type: "array" }
  },
  defaults: { sortOrder: 0 }
};

// ================================================================
//  VALIDATION
// ================================================================

/**
 * Validate attrs against its type schema.
 * @param {string} type — one of KnowledgeType values
 * @param {object} attrs — the attrs object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAttrs(type, attrs) {
  var schema = ATTRS_SCHEMA[type];
  var errors = [];

  if (!schema) {
    errors.push("Unknown knowledge type: " + type);
    return { valid: false, errors: errors };
  }

  attrs = attrs || {};

  // Check required fields
  schema.required.forEach(function (field) {
    if (attrs[field] === undefined || attrs[field] === null || attrs[field] === "") {
      errors.push("Missing required field: " + field);
    }
  });

  // Check optional field types/values
  Object.keys(schema.optional).forEach(function (field) {
    var val = attrs[field];
    if (val === undefined || val === null) return; // not provided, ok
    var rule = schema.optional[field];
    if (rule.type === "string" && typeof val !== "string") {
      errors.push(field + " must be a string");
    }
    if (rule.type === "number" && typeof val !== "number") {
      errors.push(field + " must be a number");
    }
    if (rule.type === "boolean" && typeof val !== "boolean") {
      errors.push(field + " must be a boolean");
    }
    if (rule.type === "array" && !Array.isArray(val)) {
      errors.push(field + " must be an array");
    }
    if (rule.values && rule.values.indexOf(val) === -1) {
      errors.push(field + " must be one of: " + rule.values.join(", "));
    }
    if (rule.min !== undefined && val < rule.min) {
      errors.push(field + " minimum is " + rule.min);
    }
    if (rule.max !== undefined && val > rule.max) {
      errors.push(field + " maximum is " + rule.max);
    }
  });

  return { valid: errors.length === 0, errors: errors };
}

/**
 * Build attrs with defaults applied for a given type.
 * @param {string} type
 * @param {object} [overrides]
 * @returns {object}
 */
function buildAttrs(type, overrides) {
  var schema = ATTRS_SCHEMA[type];
  if (!schema) return overrides || {};

  var defaults = schema.defaults || {};
  var result = {};
  Object.keys(defaults).forEach(function (k) {
    result[k] = defaults[k];
  });
  if (overrides) {
    Object.keys(overrides).forEach(function (k) {
      result[k] = overrides[k];
    });
  }
  return result;
}
