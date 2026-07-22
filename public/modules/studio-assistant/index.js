var StudioAssistant = (function () {
  "use strict";
  var state = { project: null, chapter: null, sessions: [], session: null, messages: [], memories: [], controller: null, selection: null, context: null };

  function toast(text) { if (window.LayoutSkill) LayoutSkill.showToast(text); }
  function api(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || !json.success) throw new Error(json.error || "请求失败");
        return json.data;
      });
    });
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, className, handler) {
    var node = el("button", className, text);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  }
  function currentProject() { return state.project || (window.LayoutSkill && LayoutSkill.getState().activeProject); }
  function currentChapter() { return state.chapter || (window.LayoutSkill && LayoutSkill.getActiveChapter()); }
  function editor() { return document.getElementById("editor"); }

  function removeLegacyButtons() {
    document.querySelectorAll(".ai-actions .ai-btn").forEach(function (node) {
      if (node.id !== "finalize-btn") node.remove();
    });
  }

  function renderShell() {
    var root = document.getElementById("right-content");
    if (!root) return;
    root.textContent = "";
    root.className = "studio-assistant";
    var header = el("div", "sa-header");
    header.appendChild(el("strong", "", "AI 创作助手"));
    var controls = el("div", "sa-header-actions");
    controls.appendChild(button("历史", "sa-small", toggleHistory));
    controls.appendChild(button("新对话", "sa-small", newSession));
    header.appendChild(controls);
    root.appendChild(header);
    root.appendChild(el("div", "sa-history hidden"));
    root.appendChild(el("div", "sa-messages"));
    var context = el("div", "sa-context");
    context.appendChild(el("span", "sa-context-text", contextLabel()));
    context.appendChild(button("记忆", "sa-link", showMemories));
    root.appendChild(context);
    var composer = el("div", "sa-composer");
    var input = el("textarea", "sa-input");
    input.placeholder = state.project ? "讨论剧情、人物、节奏或当前正文……" : "请先选择项目";
    input.disabled = !state.project;
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
    });
    composer.appendChild(input);
    var row = el("div", "sa-compose-actions");
    var stop = button("停止", "sa-stop hidden", stop);
    stop.dataset.role = "stop";
    row.appendChild(stop);
    row.appendChild(button("发送", "sa-send", send));
    composer.appendChild(row);
    root.appendChild(composer);
    renderHistory();
    renderMessages();
  }

  function contextLabel() {
    if (!state.project) return "当前上下文：未选择项目";
    var bits = ["项目：" + (state.project.name || "未命名")];
    if (state.chapter) bits.push("章节：" + (state.chapter.title || "未命名"));
    if (state.selection && state.selection.text) bits.push("已选正文 " + state.selection.text.length + " 字");
    bits.push("记忆 " + state.memories.filter(function (m) { return m.status === "active"; }).length + " 条");
    return "当前上下文：" + bits.join(" · ");
  }

  function updateContextLabel() {
    var node = document.querySelector(".sa-context-text");
    if (node) node.textContent = contextLabel();
  }

  function renderHistory() {
    var box = document.querySelector(".sa-history");
    if (!box) return;
    box.textContent = "";
    if (!state.sessions.length) box.appendChild(el("div", "sa-muted", "暂无历史对话"));
    state.sessions.forEach(function (session) {
      var item = button(session.title || "新对话", "sa-history-item" + (state.session && state.session.id === session.id ? " active" : ""), function () { openSession(session.id); });
      box.appendChild(item);
    });
  }

  function toggleHistory() {
    var box = document.querySelector(".sa-history");
    if (box) box.classList.toggle("hidden");
  }

  function renderMessages() {
    var list = document.querySelector(".sa-messages");
    if (!list) return;
    list.textContent = "";
    if (!state.messages.length) list.appendChild(el("div", "sa-empty", "我会结合当前项目、章节、正文和已确认记忆与你讨论。不会自动改写正文。"));
    state.messages.forEach(function (message) { list.appendChild(messageNode(message)); });
    list.scrollTop = list.scrollHeight;
  }

  function messageNode(message) {
    var card = el("div", "sa-message " + (message.role === "user" ? "user" : "assistant"));
    card.appendChild(el("div", "sa-role", message.role === "user" ? "你" : "AI"));
    card.appendChild(el("div", "sa-content", message.content || ""));
    if (message.role === "assistant") {
      var actions = el("div", "sa-message-actions");
      actions.appendChild(button("复制", "sa-link", function () { copyText(message.content); }));
      actions.appendChild(button("插入光标", "sa-link", function () { insertText(message.content, false); }));
      var replace = button("替换选区", "sa-link", function () { insertText(message.content, true); });
      replace.disabled = !(state.selection && state.selection.end > state.selection.start);
      actions.appendChild(replace);
      actions.appendChild(button("保存为记忆", "sa-link", function () { editMemory(null, message.content, message.id); }));
      card.appendChild(actions);
    }
    return card;
  }

  function copyText(text) {
    if (!navigator.clipboard) return toast("浏览器不支持剪贴板访问");
    navigator.clipboard.writeText(text).then(function () { toast("已复制"); }).catch(function () { toast("复制失败"); });
  }

  function captureSelection() {
    var ed = editor();
    if (!ed || ed.style.display === "none") { state.selection = null; return; }
    state.selection = { start: ed.selectionStart, end: ed.selectionEnd, text: ed.value.slice(ed.selectionStart, ed.selectionEnd) };
    updateContextLabel();
  }

  function insertText(text, replace) {
    var ed = editor();
    if (!ed || !state.chapter) return toast("请先选择章节");
    var selection = state.selection || { start: ed.selectionStart, end: ed.selectionEnd, text: "" };
    if (replace && selection.end <= selection.start) return toast("当前没有有效选区");
    var action = replace ? "替换当前选中的正文" : "在光标位置插入这段内容";
    NovelOSModal.confirm("确认修改正文", "确定要" + action + "吗？修改后请使用原有保存按钮保存。").then(function (ok) {
      if (!ok) return;
      var start = replace ? selection.start : selection.end;
      var end = replace ? selection.end : selection.end;
      ed.setRangeText(text, start, end, "end");
      ed.focus();
      captureSelection();
      toast("正文已修改，尚未保存");
    });
  }

  function loadProjectData() {
    if (!state.project) return Promise.resolve();
    var projectId = encodeURIComponent(state.project.id);
    return Promise.all([
      api("/api/chat/sessions?projectId=" + projectId),
      api("/api/chat/memories?projectId=" + projectId),
    ]).then(function (values) {
      state.sessions = values[0]; state.memories = values[1];
      var lastId = localStorage.getItem("novelos.chat." + state.project.id);
      var target = state.sessions.find(function (s) { return s.id === lastId; }) || state.sessions[0];
      renderShell();
      if (target) return openSession(target.id);
      return newSession();
    }).catch(function (error) { renderShell(); toast(error.message); });
  }

  function newSession() {
    if (!state.project) return;
    return api("/api/chat/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: state.project.id, chapterId: state.chapter && state.chapter.id }) })
      .then(function (session) {
        state.sessions.unshift(session); state.session = session; state.messages = [];
        localStorage.setItem("novelos.chat." + state.project.id, session.id);
        renderHistory(); renderMessages();
      }).catch(function (error) { toast(error.message); });
  }

  function openSession(id) {
    if (!state.project) return;
    return api("/api/chat/sessions/" + encodeURIComponent(id) + "?projectId=" + encodeURIComponent(state.project.id)).then(function (session) {
      state.session = session; state.messages = session.messages || [];
      localStorage.setItem("novelos.chat." + state.project.id, session.id);
      renderHistory(); renderMessages();
    }).catch(function (error) { toast(error.message); });
  }

  function setSending(sending) {
    var input = document.querySelector(".sa-input");
    var sendButton = document.querySelector(".sa-send");
    var stopButton = document.querySelector('[data-role="stop"]');
    if (input) input.disabled = sending;
    if (sendButton) sendButton.disabled = sending;
    if (stopButton) stopButton.classList.toggle("hidden", !sending);
  }

  function send() {
    var input = document.querySelector(".sa-input");
    var content = input ? input.value.trim() : "";
    if (!content || !state.project || !state.session || state.controller) return;
    captureSelection();
    var draft = input.value;
    state.messages.push({ role: "user", content: content });
    state.messages.push({ role: "assistant", content: "" });
    renderMessages(); setSending(true);
    state.controller = new AbortController();
    var chapter = currentChapter();
    fetch("/api/chat/stream", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: state.controller.signal,
      body: JSON.stringify({ projectId: state.project.id, sessionId: state.session.id, chapterId: chapter && chapter.id, content: content, selectedText: state.selection && state.selection.text, chapterContent: editor() && editor().value }),
    }).then(function (response) {
      if (!response.ok) return response.json().then(function (json) { throw new Error(json.error || "发送失败"); });
      input.value = "";
      var reader = response.body.getReader(), decoder = new TextDecoder(), buffer = "";
      function read() { return reader.read().then(function (chunk) {
        if (chunk.done) return;
        buffer += decoder.decode(chunk.value, { stream: true });
        var lines = buffer.split("\n"); buffer = lines.pop() || "";
        lines.forEach(function (line) {
          if (line.indexOf("data: ") !== 0) return;
          var event; try { event = JSON.parse(line.slice(6)); } catch (_) { return; }
          if (event.error) throw new Error(event.error);
          if (event.context) { state.context = event.context; updateContextLabel(); }
          if (event.token) { var last = state.messages[state.messages.length - 1]; last.content += event.token; renderMessages(); }
          if (event.messageId) state.messages[state.messages.length - 1].id = event.messageId;
        });
        return read();
      }); }
      return read();
    }).then(function () {
      return api("/api/chat/sessions?projectId=" + encodeURIComponent(state.project.id)).then(function (sessions) { state.sessions = sessions; renderHistory(); });
    }).catch(function (error) {
      if (error.name !== "AbortError") { input.value = draft; toast(error.message || "发送失败，输入内容已保留"); }
      if (!state.messages[state.messages.length - 1].content) state.messages.pop();
      renderMessages();
    }).finally(function () { state.controller = null; setSending(false); });
  }

  function stop() { if (state.controller) state.controller.abort(); }

  function modalForm(title, memory, defaultContent) {
    return new Promise(function (resolve) {
      var overlay = el("div", "novelos-modal-overlay");
      var modal = el("div", "novelos-modal sa-memory-modal");
      modal.appendChild(el("div", "novelos-modal-title", title));
      var titleInput = el("input", "novelos-modal-input"); titleInput.placeholder = "标题"; titleInput.value = memory ? memory.title : "";
      var category = el("input", "novelos-modal-input"); category.placeholder = "分类"; category.value = memory ? memory.category : "设定";
      var content = el("textarea", "novelos-modal-input sa-memory-content"); content.placeholder = "记忆内容"; content.value = memory ? memory.content : (defaultContent || "");
      modal.appendChild(titleInput); modal.appendChild(category); modal.appendChild(content);
      var footer = el("div", "novelos-modal-footer");
      function close(value) { overlay.remove(); resolve(value); }
      footer.appendChild(button("取消", "novelos-modal-btn", function () { close(null); }));
      footer.appendChild(button("确认保存", "novelos-modal-btn novelos-modal-btn-primary", function () {
        if (!titleInput.value.trim() || !content.value.trim()) return toast("标题和内容不能为空");
        close({ title: titleInput.value.trim(), category: category.value.trim() || "其他", content: content.value.trim() });
      }));
      modal.appendChild(footer); overlay.appendChild(modal); document.body.appendChild(overlay); titleInput.focus();
    });
  }

  function editMemory(memory, defaultContent, sourceMessageId) {
    if (!state.project) return;
    modalForm(memory ? "编辑长期记忆" : "保存为长期记忆", memory, defaultContent).then(function (values) {
      if (!values) return;
      values.projectId = state.project.id; if (sourceMessageId) values.sourceMessageId = sourceMessageId;
      return api(memory ? "/api/chat/memories/" + encodeURIComponent(memory.id) : "/api/chat/memories", {
        method: memory ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
      }).then(function () { toast("长期记忆已保存"); return refreshMemories(); });
    }).catch(function (error) { toast(error.message); });
  }

  function refreshMemories() {
    return api("/api/chat/memories?projectId=" + encodeURIComponent(state.project.id)).then(function (items) { state.memories = items; updateContextLabel(); showMemories(); });
  }

  function showMemories() {
    if (!state.project) return;
    var overlay = el("div", "novelos-modal-overlay");
    var modal = el("div", "novelos-modal sa-memory-list");
    var header = el("div", "novelos-modal-title", "当前项目的长期记忆"); modal.appendChild(header);
    modal.appendChild(button("从当前选区新建", "sa-small", function () { overlay.remove(); captureSelection(); editMemory(null, state.selection && state.selection.text); }));
    if (!state.memories.length) modal.appendChild(el("p", "sa-muted", "暂无已确认记忆"));
    state.memories.forEach(function (memory) {
      var card = el("div", "sa-memory-card"); card.appendChild(el("strong", "", memory.title)); card.appendChild(el("small", "", memory.category)); card.appendChild(el("p", "", memory.content));
      card.appendChild(button("编辑", "sa-link", function () { overlay.remove(); editMemory(memory); }));
      card.appendChild(button("删除", "sa-link danger", function () {
        NovelOSModal.confirm("删除长期记忆", "确定删除“" + memory.title + "”吗？此操作无法撤销。").then(function (ok) {
          if (!ok) return; return api("/api/chat/memories/" + encodeURIComponent(memory.id) + "?projectId=" + encodeURIComponent(state.project.id), { method: "DELETE" }).then(refreshMemories);
        }).catch(function (error) { toast(error.message); });
      })); modal.appendChild(card);
    });
    modal.appendChild(button("关闭", "novelos-modal-btn", function () { overlay.remove(); }));
    overlay.appendChild(modal); document.body.appendChild(overlay);
  }

  function finalizeChapter() {
    var project = currentProject(), chapter = currentChapter(), ed = editor();
    if (!project || !chapter || !ed || !ed.value.trim()) return toast("请先选择有正文的章节");
    var btn = document.getElementById("finalize-btn"); if (btn) btn.disabled = true;
    fetch("/api/projects/" + encodeURIComponent(project.id) + "/chapters/" + encodeURIComponent(chapter.id) + "/finalize", { method: "POST", headers: { "Content-Type": "application/json" } })
      .then(function (r) { return r.json(); }).then(function (result) {
        if (!result.success) throw new Error(result.error || "定稿失败");
        chapter.status = "finalized"; toast("定稿完成，摘要与新设定扫描已完成");
        var suggestions = result.data && result.data.suggestions || [];
        if (suggestions.length) renderSuggestions(suggestions, project.id);
      }).catch(function (error) { toast(error.message); }).finally(function () { if (btn) btn.disabled = false; });
  }

  function renderSuggestions(suggestions, projectId) {
    var list = document.querySelector(".sa-messages"); if (!list) return;
    var card = el("div", "sa-message assistant"); card.appendChild(el("div", "sa-role", "新设定建议"));
    suggestions.forEach(function (suggestion) {
      var row = el("div", "sa-suggestion"); row.appendChild(el("strong", "", suggestion.name)); row.appendChild(el("span", "", suggestion.content || ""));
      row.appendChild(button("加入故事圣经", "sa-link", function () {
        if (!window.KnowledgeSkill) return toast("故事圣经模块未加载");
        KnowledgeSkill.create({ projectId: projectId, type: suggestion.type, name: suggestion.name, summary: suggestion.content || "", description: suggestion.content || "", tags: ["AI提取"], attrs: KnowledgeSkill.buildAttrs(suggestion.type, {}) }).then(function (result) { toast(result.success ? "已加入故事圣经" : (result.error || "添加失败")); });
      })); card.appendChild(row);
    }); list.appendChild(card);
  }

  function onProjectChange(project) { state.project = project; state.chapter = null; state.session = null; state.messages = []; state.sessions = []; state.memories = []; renderShell(); loadProjectData(); }
  function onChapterChange(chapter) { state.chapter = chapter; captureSelection(); renderShell(); }
  function init() {
    removeLegacyButtons();
    var ed = editor(); if (ed) { ed.addEventListener("select", captureSelection); ed.addEventListener("keyup", captureSelection); ed.addEventListener("mouseup", captureSelection); }
  }

  document.addEventListener("DOMContentLoaded", init);
  return { onProjectChange: onProjectChange, onChapterChange: onChapterChange, finalizeChapter: finalizeChapter, newSession: newSession, showMemories: showMemories };
})();
