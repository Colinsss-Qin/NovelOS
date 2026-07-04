/* ================================================================
   Knowledge Skill / Public API
   Unified CRUD + search for all 10 knowledge types.
   Exposed as window.KnowledgeSkill.
   ================================================================ */

(function () {

  // ==============================================================
  //  INIT
  // ==============================================================

  /**
   * Initialize the knowledge store from novelData.
   * Call once after novelData is available.
   * @param {object} novelData — the global data object
   * @param {string} projectId
   */
  function init(novelData, projectId) {
    return seedFromNovelData(novelData, projectId);
  }

  // ==============================================================
  //  CRUD
  // ==============================================================

  /**
   * Create a new knowledge item (with validation).
   * @param {object} opts — { projectId, type, name, ... }
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  function create(opts) {
    // Validate type
    if (!opts.type || !KnowledgeTypeLabel[opts.type]) {
      return Promise.resolve({ success: false, error: "Invalid type: " + opts.type });
    }
    // Validate name
    if (!opts.name || !opts.name.trim()) {
      return Promise.resolve({ success: false, error: "name is required" });
    }
    // Validate attrs
    var validation = validateAttrs(opts.type, opts.attrs);
    if (!validation.valid) {
      return Promise.resolve({ success: false, error: "Attrs validation failed: " + validation.errors.join("; ") });
    }

    return fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: opts.projectId,
        type: opts.type,
        name: opts.name.trim(),
        summary: opts.summary || "",
        description: opts.description || "",
        tags: opts.tags || [],
        aliases: opts.aliases || [],
        attrs: opts.attrs || {}
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) {
        return { success: false, error: result.error || "创建失败" };
      }
      var apiItem = result.data;
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
        updatedAt: apiItem.updatedAt || new Date().toISOString()
      };
      insert(item);
      return { success: true, data: item };
    })
    .catch(function (err) {
      return { success: false, error: err.message };
    });
  }

  /**
   * Get item by ID.
   */
  function get(id) {
    var item = getById(id);
    if (!item) return { success: false, error: "Not found" };
    return { success: true, data: item };
  }

  /**
   * List items with optional type + search + tag filter + pagination.
   * @param {object} opts — { projectId, type?, query?, tags?, limit?, offset? }
   */
  function listItems(opts) {
    if (!opts || !opts.projectId) {
      return { success: false, error: "projectId is required" };
    }
    var items = list(opts.projectId, opts.type);
    var result = query(items, {
      query:  opts.query,
      tags:   opts.tags,
      mode:   opts.mode,
      limit:  opts.limit,
      offset: opts.offset
    });
    return { success: true, data: result };
  }

  /**
   * Update an item partially.
   */
  function patch(id, data) {
    return fetch("/api/items/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        summary: data.summary,
        description: data.description,
        tags: data.tags,
        aliases: data.aliases,
        attrs: data.attrs
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) {
        return { success: false, error: result.error || "更新失败" };
      }
      var apiItem = result.data;
      // Sync to local store
      var patchData = {
        name: apiItem.name,
        summary: apiItem.summary || "",
        description: apiItem.description || "",
        tags: apiItem.tags ? apiItem.tags.split(",").map(function (s) { return s.trim(); }) : [],
        aliases: apiItem.aliases ? apiItem.aliases.split(",").map(function (s) { return s.trim(); }) : [],
        attrs: apiItem.attrs || {}
      };
      var item = update(id, patchData);
      return { success: true, data: item };
    })
    .catch(function (err) {
      return { success: false, error: err.message };
    });
  }

  /**
   * Delete an item.
   */
  function del(id) {
    return fetch("/api/items/" + encodeURIComponent(id), {
      method: "DELETE"
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) {
        return { success: false, error: result.error || "删除失败" };
      }
      remove(id);
      return { success: true, data: null };
    })
    .catch(function (err) {
      return { success: false, error: err.message };
    });
  }

  /**
   * Get all tags in a project.
   */
  function tags(projectId) {
    return { success: true, data: getAllTags(projectId) };
  }

  // ==============================================================
  //  PUBLIC API
  // ==============================================================
  window.KnowledgeSkill = {
    // Lifecycle
    init:     init,
    loadFromApi: loadFromApi,

    // CRUD
    create:   create,
    get:      get,
    list:     listItems,
    update:   patch,
    delete:   del,
    tags:     tags,

    // Utils
    types:    KnowledgeType,
    typeLabel: KnowledgeTypeLabel,
    validateAttrs: validateAttrs,
    buildAttrs: buildAttrs
  };

})();
