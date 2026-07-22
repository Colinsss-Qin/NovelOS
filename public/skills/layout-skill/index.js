/* Minimal writing-studio coordinator. */

var toastTimer;

(function () {
  "use strict";

  var state = {
    projects: [],
    activeProject: null,
    volumes: [],
    activeChapter: null,
    saveTimer: null,
  };

  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function projectApiPath(projectId, path) {
    return "/api/projects/" + encodeURIComponent(projectId) + path;
  }

  function volumeChaptersApiPath(projectId, volumeId) {
    return projectApiPath(projectId, "/volumes/" + encodeURIComponent(volumeId) + "/chapters");
  }

  function chapterApiPath(projectId, chapterId) {
    return projectApiPath(projectId, "/chapters/" + encodeURIComponent(chapterId));
  }

  function showToast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.opacity = "0"; }, 2600);
  }

  function switchTab(name, btn) {
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.remove("active"); });
    if (btn) btn.classList.add("active");

    var views = {
      war: "view-war-room",
      bible: "view-story-bible",
      map: "view-story-map",
      character: "view-character-manager",
      outline: "view-outline-board",
      studio: "view-studio",
      future: "view-future-scene",
    };

    Object.keys(views).forEach(function (key) {
      var el = document.getElementById(views[key]);
      if (el) el.style.display = "none";
    });

    var target = document.getElementById(views[name] || "");
    if (target) target.style.display = "flex";

    if (name === "war" && window.WarRoom) WarRoom.refresh();
    if (name === "bible" && window.StoryBible) StoryBible.refresh();
    if (name === "map" && window.StoryMap) StoryMap.refresh();
    if (name === "character" && window.CharacterManager) CharacterManager.refresh();
    if (name === "outline" && window.OutlineBoard) OutlineBoard.refresh();
    if (name === "future" && window.FutureScene) FutureScene.refresh();
  }

  function init() {
    ensureProjectSelector();
    bindEditorEvents();
    resetStudioHint();
    loadProjects();
    console.log("LayoutSkill: minimal writing studio initialized");
  }

  function ensureProjectSelector() {
    var topbar = document.getElementById("topbar");
    if (!topbar || document.getElementById("project-selector-wrap")) return;

    var wrap = document.createElement("div");
    wrap.id = "project-selector-wrap";
    wrap.innerHTML =
      '<select id="project-selector" onchange="LayoutSkill.selectProject(this.value)">' +
      '<option value="">选择项目</option>' +
      '</select>' +
      '<button class="nav-btn" onclick="LayoutSkill._promptCreateProject()" title="新建项目">+</button>';

    var nameSpan = document.getElementById("topbar-project-name");
    if (nameSpan) nameSpan.parentNode.insertBefore(wrap, nameSpan);
    else topbar.appendChild(wrap);
  }

  function loadProjects() {
    return fetch("/api/projects")
      .then(function (r) { return r.json(); })
      .then(function (result) {
        state.projects = result.success ? (result.data || []) : [];
        renderProjectSelector();
        if (!state.activeProject && state.projects.length > 0) {
          return selectProject(state.projects[0].id);
        }
        if (state.projects.length === 0) {
          clearEditor();
          buildTree([], document.getElementById("story-tree"), {
            onCreateChapter: function () { showToast("请先新建项目"); },
          });
        }
      })
      .catch(function (e) {
        console.error("LayoutSkill: loadProjects failed:", e);
        showToast("项目加载失败：" + e.message);
      });
  }

  function renderProjectSelector() {
    var sel = document.getElementById("project-selector");
    if (!sel) return;
    sel.innerHTML = '<option value="">选择项目</option>' + state.projects.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.name || p.title || "未命名项目") + '</option>';
    }).join("");
    if (state.activeProject) sel.value = state.activeProject.id;
  }

  function selectProject(projectId) {
    if (!projectId) return;
    var found = state.projects.find(function (p) { return p.id === projectId; });
    if (!found) return;

    var doSwitch = function () {
      state.activeProject = found;
      state.activeChapter = null;
      clearEditor();
      if (window.StudioAssistant) StudioAssistant.onProjectChange(found);
      else resetStudioHint();

      var nameEl = document.getElementById("topbar-project-name");
      if (nameEl) nameEl.textContent = "项目：" + (found.name || found.title || "未命名项目");
      var sel = document.getElementById("project-selector");
      if (sel) sel.value = projectId;

      syncProjectModules(found);
      return loadVolumes(projectId);
    };

    if (state.activeChapter) {
      var editor = document.getElementById("editor");
      if (editor && editor.value !== (state.activeChapter.content || "")) {
        return saveChapter(true).then(doSwitch);
      }
    }
    return doSwitch();
  }

  function syncProjectModules(project) {
    var projectId = project && project.id;
    if (!projectId) return;
    var modules = [
      { api: window.WarRoom, args: ["view-war-room", projectId] },
      { api: window.StoryBible, args: ["view-story-bible", projectId, project.name, project.genre] },
      { api: window.StoryMap, args: ["view-story-map", projectId] },
      { api: window.CharacterManager, args: ["view-character-manager", projectId] },
      { api: window.OutlineBoard, args: ["view-outline-board", projectId] },
      { api: window.FutureScene, args: ["view-future-scene", projectId] },
    ];
    modules.forEach(function (entry) {
      if (!entry.api || typeof entry.api.init !== "function") return;
      try { entry.api.init.apply(entry.api, entry.args); }
      catch (e) { console.warn("LayoutSkill: module sync failed:", e.message); }
    });
  }

  function loadVolumes(projectId) {
    return fetch(projectApiPath(projectId, "/volumes"))
      .then(function (r) { return r.json(); })
      .then(function (result) {
        state.volumes = result.success ? (result.data || []) : [];
        renderTree();
      })
      .catch(function (e) {
        console.error("LayoutSkill: loadVolumes failed:", e);
        state.volumes = [];
        renderTree();
      });
  }

  function renderTree() {
    buildTree(state.volumes, document.getElementById("story-tree"), {
      onCreateChapter: promptCreateChapter,
      onChapterClick: function (chapterId) { loadChapter(chapterId); },
      onDeleteChapter: deleteChapter,
    });
  }

  function ensureDefaultVolume() {
    if (!state.activeProject) return Promise.reject(new Error("请先选择项目"));
    if (state.volumes.length > 0) return Promise.resolve(state.volumes[0]);
    return fetch(projectApiPath(state.activeProject.id, "/volumes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "正文", order: 0 }),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) throw new Error(result.error || "创建默认卷失败");
        state.volumes = [result.data];
        return result.data;
      });
  }

  function promptCreateChapter(volumeId) {
    if (!state.activeProject) {
      showToast("请先新建或选择项目");
      return;
    }
    NovelOSModal.prompt("新建章节", "请输入章节标题", "新章节").then(function (title) {
      if (!title || !title.trim()) return;
      createChapter(volumeId, title.trim());
    });
  }

  function createChapter(volumeId, title) {
    return ensureDefaultVolume()
      .then(function (volume) {
        var targetVolumeId = volumeId || volume.id;
        return fetch(
          volumeChaptersApiPath(state.activeProject.id, targetVolumeId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title, content: "", status: "draft" }),
          }
        );
      })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) throw new Error(result.error || "创建章节失败");
        showToast("章节已创建");
        return loadVolumes(state.activeProject.id).then(function () {
          return loadChapter(result.data.id, true);
        });
      })
      .catch(function (e) {
        showToast(e.message);
        console.error("LayoutSkill: createChapter failed:", e);
      });
  }

  function loadChapter(chapterId, skipSave) {
    if (!state.activeProject) return;

    // 点击当前已选中的章节，无需重新加载
    if (state.activeChapter && state.activeChapter.id === chapterId) return;

    clearTimeout(state.saveTimer);

    var doLoad = function () {
      return fetch(chapterApiPath(state.activeProject.id, chapterId))
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result.success) throw new Error(result.error || "章节加载失败");
          state.activeChapter = result.data;
          renderEditor(result.data);
          if (window.StudioAssistant) StudioAssistant.onChapterChange(result.data);
          else renderContextPanel(result.data);
          highlightChapter(chapterId);
        })
        .catch(function (e) {
          showToast(e.message);
          console.error("LayoutSkill: loadChapter failed:", e);
        });
    };

    if (!skipSave && state.activeChapter && state.activeChapter.id !== chapterId) {
      var editor = document.getElementById("editor");
      if (editor && editor.value !== (state.activeChapter.content || "")) {
        showToast("正在保存当前章节...");
        return saveChapter(true).then(doLoad);
      }
    }
    return doLoad();
  }

  function saveChapter(blockOnFailure) {
    if (!state.activeProject || !state.activeChapter) return Promise.resolve();
    var editor = document.getElementById("editor");
    if (!editor) return Promise.resolve();
    var content = editor.value || "";
    var wordCount = content.replace(/\s/g, "").length;
    var chapterId = state.activeChapter.id;

    setSaveButtonState(true);

    return fetch(
      chapterApiPath(state.activeProject.id, chapterId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content, wordCount: wordCount }),
      }
    )
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) throw new Error(result.error || "保存失败");
        if (state.activeChapter && state.activeChapter.id === chapterId) {
          state.activeChapter = result.data;
        }
        updateMeta(wordCount);
        showSaveIndicator("已保存");
        setSaveButtonState(false);
        loadVolumes(state.activeProject.id);
        return result.data;
      })
      .catch(function (e) {
        showSaveIndicator("保存失败");
        setSaveButtonState(false, true);
        console.error("LayoutSkill: save failed:", e);
        if (blockOnFailure) throw e;
      });
  }

  function deleteChapter(chapterId) {
    if (!state.activeProject || !chapterId) return Promise.resolve();
    var proceed = Promise.resolve(true);
    if (window.NovelOSModal && NovelOSModal.confirm) {
      proceed = NovelOSModal.confirm("删除章节", "确定删除这个章节吗？");
    }

    return proceed.then(function (ok) {
      if (!ok) return;
      clearTimeout(state.saveTimer);
      return fetch(
        chapterApiPath(state.activeProject.id, chapterId),
        { method: "DELETE" }
      )
        .then(function (r) { return r.json(); })
        .then(function (result) {
          if (!result.success) throw new Error(result.error || "删除章节失败");
          if (state.activeChapter && state.activeChapter.id === chapterId) {
            state.activeChapter = null;
            clearEditor();
            resetStudioHint();
          }
          showToast("章节已删除");
          return loadVolumes(state.activeProject.id);
        });
    }).catch(function (e) {
      showToast(e.message || "删除章节失败");
      console.error("LayoutSkill: deleteChapter failed:", e);
    });
  }

  function setSaveButtonState(loading, isError) {
    var btn = document.getElementById("save-btn");
    if (!btn) return;
    if (loading) {
      btn.textContent = "保存中...";
      btn.disabled = true;
      btn.classList.add("saving");
    } else {
      btn.disabled = false;
      btn.classList.remove("saving");
      if (isError) {
        btn.textContent = "重试保存";
        btn.classList.add("save-error");
      } else {
        btn.textContent = "💾 保存";
        btn.classList.remove("save-error");
      }
    }
  }

  function debounceSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      saveChapter();
    }, 800);
  }

  function bindEditorEvents() {
    var editor = document.getElementById("editor");
    if (!editor) return;
    editor.addEventListener("input", debounceSave);
    editor.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveChapter();
      }
    });

    window.addEventListener("beforeunload", function (e) {
      if (!state.activeChapter) return;
      var ed = document.getElementById("editor");
      if (ed && ed.value !== (state.activeChapter.content || "")) {
        e.preventDefault();
        e.returnValue = "你有未保存的修改，确定要离开吗？";
        return e.returnValue;
      }
    });
  }

  function updateMeta(wordCount) {
    var metaEl = document.getElementById("ch-meta");
    if (!metaEl || !state.activeChapter) return;
    metaEl.textContent =
      (wordCount || 0).toLocaleString() + " 字 · " + formatChapterStatus(state.activeChapter.status);
  }

  function showSaveIndicator(text) {
    var el = document.getElementById("save-indicator");
    if (!el) return;
    el.textContent = text || "已保存";
    el.style.opacity = "1";
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.style.opacity = "0"; }, 1600);
  }

  function renderContextPanel(ch) {
    var container = document.getElementById("right-content");
    if (!container) return;
    var projectId = state.activeProject ? state.activeProject.id : "";

    container.innerHTML =
      '<div class="section"><div class="section-title">🌱 剧情种子</div>' +
      '<div class="seed-row">' +
      '<textarea class="seed-input" id="seed-input" placeholder="本章要发生的事…" rows="2">' + esc(ch.summary || "") + '</textarea>' +
      '</div>' +
      '<div style="margin-top:6px">' +
      '<button class="seed-design-btn" id="seed-design-btn" onclick="PlotDesigner.show(\'' + ch.id + '\',\'' + projectId + '\',{hero:\'\',heroGoal:\'\',rival:\'\',rivalGoal:\'\',infoGap:\'\',expected:\'\'})">🎯 启动剧情设计器</button>' +
      '<button class="seed-design-btn" style="margin-left:6px;border-color:#5aab8a;color:#5aab8a" id="seed-save-btn">💾 保存种子</button>' +
      '</div>' +
      '</div>' +
      '<div class="section"><div class="section-title">章节信息</div>' +
      '<div class="ctx-item"><div class="ctx-label">标题</div><div class="ctx-value">' + esc(ch.title || "") + '</div></div>' +
      '<div class="ctx-item"><div class="ctx-label">状态</div><div class="ctx-value">' + formatChapterStatus(ch.status) + '</div></div>' +
      '<div class="ctx-item"><div class="ctx-label">字数</div><div class="ctx-value">' + (ch.wordCount || 0).toLocaleString() + ' 字</div></div>' +
      '</div>';

    // Save seed button
    setTimeout(function () {
      var saveBtn = document.getElementById("seed-save-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          var seedVal = (document.getElementById("seed-input") || {}).value || "";
          fetch("/api/projects/" + encodeURIComponent(projectId) + "/chapters/" + encodeURIComponent(ch.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summary: seedVal }),
          })
          .then(function (r) { return r.json(); })
          .then(function (result) {
            if (result.success) {
              if (state.activeChapter) state.activeChapter.summary = seedVal;
              showToast("✅ 剧情种子已保存");
            } else {
              showToast("保存失败：" + (result.error || "未知错误"));
            }
          })
          .catch(function (err) { showToast("请求失败：" + err.message); });
        });
      }
      // Plot designer button: prefill with existing data
      var pdBtn = document.getElementById("seed-design-btn");
      if (pdBtn) {
        pdBtn.addEventListener("click", function (e) {
          var seedVal = (document.getElementById("seed-input") || {}).value || "";
          var prefill = { hero: "", heroGoal: "", rival: "", rivalGoal: "", infoGap: seedVal, expected: "" };
          PlotDesigner.show(ch.id, projectId, prefill);
        });
      }
    }, 100);
  }

  function resetStudioHint() {
    var right = document.getElementById("right-content");
    if (right) {
      right.innerHTML =
        '<div id="empty-hint"><span style="font-size:36px">AI</span><p>选择章节后显示章节信息</p></div>';
    }
  }

  function promptCreateProject() {
    NovelOSModal.prompt("新建项目", "请输入项目名称", "我的小说").then(function (name) {
      if (!name || !name.trim()) return;
      NovelOSModal.prompt("新建项目", "请输入项目类型", "未分类").then(function (genre) {
        createProject(name.trim(), (genre || "未分类").trim());
      });
    });
  }

  function createProject(name, genre) {
    return fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, genre: genre || "未分类" }),
    })
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success) throw new Error(result.error || "创建项目失败");
        showToast("项目已创建");
        return loadProjects().then(function () {
          return selectProject(result.data.id);
        });
      })
      .catch(function (e) {
        showToast(e.message);
        console.error("LayoutSkill: createProject failed:", e);
      });
  }

  window.LayoutSkill = {
    init: init,
    showToast: showToast,
    switchTab: switchTab,
    loadProjects: loadProjects,
    selectProject: selectProject,
    createProject: createProject,
    createChapter: createChapter,
    saveChapter: saveChapter,
    deleteChapter: deleteChapter,
    getActiveProjectId: function () { return state.activeProject ? state.activeProject.id : null; },
    getActiveChapter: function () { return state.activeChapter; },
    getState: function () { return state; },
    _promptCreateProject: promptCreateProject,
    _promptCreateChapter: promptCreateChapter,
  };
})();
