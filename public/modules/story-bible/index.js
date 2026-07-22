/* ================================================================
   Story Bible Module — 故事圣经
   Orchestrates KnowledgeSkill + AISkill + LayoutSkill.
   Exposed as window.StoryBible.
   ================================================================ */

(function () {

  // Module state
  var state = {
    projectId: null,
    activeType: "character",
    view: "list",      // "list" | "detail" | "editor"
    detailItem: null,
    editorMode: "create",
    editorItem: null,
    searchQuery: "",
    activeTags: []
  };

  // Container element
  var container = null;

  // ==============================================================
  //  INIT
  // ==============================================================

  function init(containerId, projectId, projectName, projectGenre) {
    try {
      container = document.getElementById(containerId);
      if (!container) { console.error("StoryBible: container #" + containerId + " not found"); return; }

      // 显示加载中状态
      container.innerHTML = '<div style="padding:40px;color:#d4a574;text-align:center"><p>📖 故事圣经加载中…</p></div>';

      state.projectId = projectId || null;

      // Build layout
      _renderLayout();

      // Init sub-components
      _safeInit(TypeNav, "sb-type-nav");
      _safeInit(SearchBar, "sb-search-bar");
      _safeInit(ItemList, "sb-content-area");
      _safeInit(ItemDetail, "sb-content-area");
      _safeInit(ItemEditor, "sb-content-area");
      _safeInit(TagCloud, "sb-tag-cloud");
      _safeInit(QuickActions, "sb-quick-actions");
      _safeInit(DeleteConfirm);

      // Wire events
      TypeNav.onChange = _onTypeChange;
      SearchBar.onSearch = _onSearch;
      ItemList.onSelect = _onItemSelect;
      ItemDetail.onBack = _showList;
      ItemDetail.onEdit = _editCurrentItem;
      ItemDetail.onDelete = _deleteCurrentItem;
      ItemDetail.onAIExpand = _aiExpandCurrentItem;
      ItemEditor.onSave = _onEditorSave;
      ItemEditor.onCancel = _showDetail;
      TagCloud.onTagClick = _onTagFilter;
      QuickActions.onAIGenerate = _onAIGenerate;
      DeleteConfirm.onConfirm = _doDelete;

      // Load real data from API (no more demo seeding)
      KnowledgeSkill.loadFromApi(state.projectId).then(function (result) {
        console.log("StoryBible: loaded", result.itemCount, "items from API");
        _refreshAll();
      }).catch(function () {
        console.warn("StoryBible: API load failed, starting with empty store");
        _refreshAll();
      });
      console.log("StoryBible: init complete, activeType=" + state.activeType + " view=" + state.view);
    } catch (e) {
      console.error("StoryBible init error:", e.message, e.stack);
      container.innerHTML = '<div style="padding:40px;color:#c06060"><h3>Story Bible 初始化错误</h3><pre>' + e.message + '\n' + (e.stack || '') + '</pre></div>';
    }
  }

  /** Safely call init on a component, logging failures without crashing the chain */
  function _safeInit(component, containerId) {
    try {
      if (containerId !== undefined) {
        component.init(containerId);
      } else {
        component.init();
      }
    } catch (e) {
      console.error("StoryBible: failed to init " + (component.constructor?.name || "component") + ":", e.message);
      // Don't throw — let other components continue initializing
    }
  }

  // ==============================================================
  //  LAYOUT
  // ==============================================================

  function _renderLayout() {
    container.innerHTML =
      '<div class="sb-layout">' +
      // Left: Type nav + Search
      '<div class="sb-left">' +
      '<div id="sb-type-nav"></div>' +
      '<div id="sb-search-bar"></div>' +
      '<button class="sb-create-btn" id="sb-create-btn">+ 新建</button>' +
      "</div>" +
      // Center: Content area (list / detail / editor)
      '<div class="sb-center">' +
      '<div id="sb-content-area"></div>' +
      "</div>" +
      // Right: Quick actions + Tag cloud
      '<div class="sb-right">' +
      '<div id="sb-quick-actions"></div>' +
      '<div class="sb-section-title">🏷️ 标签云</div>' +
      '<div id="sb-tag-cloud"></div>' +
      "</div>" +
      "</div>";

    // Bind create button
    document.getElementById("sb-create-btn").addEventListener("click", function () {
      state.editorMode = "create";
      state.editorItem = null;
      state.view = "editor";
      ItemEditor.showCreate(state.activeType);
    });
  }

  // ==============================================================
  //  DATA HELPERS
  // ==============================================================

  function _fetchItems() {
    var result = KnowledgeSkill.list({
      projectId: state.projectId,
      type: state.activeType,
      query: state.searchQuery,
      tags: state.activeTags.length > 0 ? state.activeTags : undefined,
      limit: 100
    });
    return (result.data && result.data.items) ? result.data.items : [];
  }

  function _refreshAll() {
    try { TypeNav.render(state.projectId); } catch (e) { console.warn("StoryBible: TypeNav.render failed:", e.message); }
    try { TagCloud.render(state.projectId); } catch (e) { console.warn("StoryBible: TagCloud.render failed:", e.message); }
    try { QuickActions.render(state.activeType, state.projectId); } catch (e) { console.warn("StoryBible: QuickActions.render failed:", e.message); }
    if (state.view === "list") {
      try { _showList(); } catch (e) { console.warn("StoryBible: _showList failed:", e.message); }
    }
  }

  // ==============================================================
  //  VIEW TRANSITIONS
  // ==============================================================

  function _showList() {
    state.view = "list";
    state.detailItem = null;
    var items = _fetchItems();
    ItemList.setItems(items);
  }

  function _showDetail() {
    if (!state.detailItem) { _showList(); return; }
    state.view = "detail";
    ItemDetail.show(state.detailItem);
  }

  // ==============================================================
  //  EVENT HANDLERS
  // ==============================================================

  function _onTypeChange(type) {
    state.activeType = type;
    state.detailItem = null;
    state.view = "list";
    SearchBar.clear();
    state.searchQuery = "";
    state.activeTags = [];
    _refreshAll();
  }

  function _onSearch(query) {
    state.searchQuery = query;
    state.view = "list";
    state.detailItem = null;
    var items = _fetchItems();
    ItemList.setItems(items);
  }

  function _onItemSelect(id) {
    var result = KnowledgeSkill.get(id);
    if (!result.success) return;
    state.detailItem = result.data;
    _showDetail();
  }

  function _editCurrentItem() {
    if (!state.detailItem) return;
    state.editorMode = "edit";
    state.editorItem = state.detailItem;
    state.view = "editor";
    ItemEditor.showEdit(state.detailItem);
  }

  function _deleteCurrentItem() {
    if (!state.detailItem) return;
    DeleteConfirm.show();
  }

  function _doDelete() {
    if (!state.detailItem) return;
    var itemId = state.detailItem.id;
    KnowledgeSkill.delete(itemId).then(function (result) {
      if (!result.success) {
        LayoutSkill.showToast("删除失败: " + result.error);
        return;
      }
      LayoutSkill.showToast("已删除");
      state.detailItem = null;
      _showList();
      TagCloud.render(state.projectId);
      TypeNav.render(state.projectId);
    });
  }

  function _aiExpandCurrentItem() {
    if (!state.detailItem) return;
    LayoutSkill.showToast("🤖 AI 扩展中…");

    var task = state.activeType === "character" ? "character_generate" : "setting_expand";
    var promptText = "请扩展以下设定：\n名称：" + state.detailItem.name +
      "\n摘要：" + (state.detailItem.summary || "") +
      "\n描述：" + (state.detailItem.description || "");

    _callAIStream(task, promptText, function (result) {
      // Store the expanded content in description
      var updateResult = KnowledgeSkill.update(state.detailItem.id, { description: result });
      if (updateResult.success) {
        state.detailItem = updateResult.data;
        _showDetail();
        LayoutSkill.showToast("✅ 扩展完成");
      }
    });
  }

  function _onEditorSave(data) {
    // Validate
    var validation = KnowledgeSkill.validateAttrs(state.activeType, data.attrs);
    if (!validation.valid) {
      LayoutSkill.showToast("校验失败: " + validation.errors.join("; "));
      return;
    }

    if (state.editorMode === "create") {
      data.projectId = state.projectId;
      KnowledgeSkill.create(data).then(function (createResult) {
        if (!createResult.success) {
          LayoutSkill.showToast("创建失败: " + createResult.error);
          return;
        }
        LayoutSkill.showToast("已创建");
        _showList();
        TypeNav.render(state.projectId);
        TagCloud.render(state.projectId);
      });
      return;
    }

    // Edit mode
    var itemId = data.id || state.editorItem.id;
    KnowledgeSkill.update(itemId, data).then(function (updateResult) {
      if (!updateResult.success) {
        LayoutSkill.showToast("更新失败: " + updateResult.error);
        return;
      }
      state.detailItem = updateResult.data;
      LayoutSkill.showToast("已保存");
      _showList();
      TypeNav.render(state.projectId);
      TagCloud.render(state.projectId);
    });
  }

  function _onTagFilter(tags) {
    state.activeTags = tags;
    state.view = "list";
    state.detailItem = null;
    var items = _fetchItems();
    ItemList.setItems(items);
  }

  function _onAIGenerate(genType) {
    LayoutSkill.showToast("🤖 AI 生成" + (KnowledgeTypeLabel[genType] || genType) + "中…");

    var task = genType === "character" ? "character_generate" : "setting_expand";
    var promptText = "请生成一个新的" + (KnowledgeTypeLabel[genType] || genType) + "设定。";

    _callAIStream(task, promptText, function (result) {
      // Switch to editor and pre-fill with AI-generated content
      _onTypeChange(genType);
      state.editorMode = "create";
      state.editorItem = null;
      state.view = "editor";
      var prefill = { name: "", summary: result.slice(0, 200), description: result, tags: ["AI生成"] };
      ItemEditor.showCreate(genType, prefill);
    });
  }

  /** Core AI stream helper — calls /api/generate and invokes callback with full result */
  function _callAIStream(task, promptText, onDone) {
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: task, userPrompt: promptText, maxTokens: 2048 })
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var result = "";

      function read() {
        reader.read().then(function (chunk) {
          if (chunk.done) { if (onDone && result) onDone(result); return; }
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(function (line) {
            var trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) return;
            try {
              var json = JSON.parse(trimmed.slice(6));
              if (json.token) result += json.token;
              if (json.error) { LayoutSkill.showToast("❌ " + json.error); return; }
            } catch (e) {}
          });
          read();
        }).catch(function (err) { LayoutSkill.showToast("❌ " + err.message); });
      }
      read();
    }).catch(function (err) { LayoutSkill.showToast("❌ 请求失败: " + err.message); });
  }

  // ==============================================================
  //  PUBLIC API
  // ==============================================================
  window.StoryBible = {
    init: init,
    refresh: _refreshAll,
    getState: function () { return state; },
    /** 从外部触发搜索（如上下文面板跳转） */
    search: function (query, type) {
      if (type) { state.activeType = type; TypeNav.setActive(type); }
      state.searchQuery = query || "";
      state.view = "list";
      state.detailItem = null;
      SearchBar.setQuery(query || "");
      _refreshAll();
    }
  };

})();
