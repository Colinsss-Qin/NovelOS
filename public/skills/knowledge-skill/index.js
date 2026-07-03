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
      return { success: false, error: "Invalid type: " + opts.type };
    }
    // Validate name
    if (!opts.name || !opts.name.trim()) {
      return { success: false, error: "name is required" };
    }
    // Validate attrs
    var validation = validateAttrs(opts.type, opts.attrs);
    if (!validation.valid) {
      return { success: false, error: "Attrs validation failed: " + validation.errors.join("; ") };
    }

    var item = createItem(opts);
    insert(item);
    return { success: true, data: item };
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
    var item = update(id, data);
    if (!item) return { success: false, error: "Not found" };
    return { success: true, data: item };
  }

  /**
   * Delete an item.
   */
  function del(id) {
    var ok = remove(id);
    if (!ok) return { success: false, error: "Not found" };
    return { success: true, data: null };
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
