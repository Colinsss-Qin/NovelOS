/* ================================================================
   Plot Designer — 剧情设计器
   分步引导：博弈结构 → AI骨架 → 应用到章节
   Exposed as window.PlotDesigner
   ================================================================ */

var PlotDesigner = (function () {
  "use strict";

  var _overlay = null;
  var _chapterId = null;
  var _projectId = null;
  var _step = 1;
  var _data = {};       // Step 1 form data
  var _skeleton = "";       // Step 2 AI result (formatted text for textarea)
  var _skeletonData = null; // Structured JSON from AI
  var _submitting = false;  // Prevent duplicate submission

  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function _showToast(msg) {
    console.log("[PlotDesigner]", msg);
    if (window.LayoutSkill && LayoutSkill.showToast) {
      LayoutSkill.showToast(msg);
    } else {
      alert(msg);
    }
  }

  function close() {
    if (_overlay) {
      document.body.removeChild(_overlay);
      _overlay = null;
    }
    _step = 1;
    _data = {};
    _skeleton = "";
    _skeletonData = null;
    _submitting = false;
  }

  // ═══════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════

  function _render() {
    if (!_overlay) return;
    var width = _step === 1 ? "520px" : _step === 2 ? "680px" : "460px";
    _overlay.innerHTML =
      '<div class="pd-modal" style="max-width:' + width + '">' +
      '<div class="pd-header">' +
      '<span class="pd-title">🎯 剧情设计器</span>' +
      '<span class="pd-steps">步骤 ' + _step + ' / 3</span>' +
      '</div>' +
      '<div class="pd-body">' + (_step === 1 ? _renderStep1() : _step === 2 ? _renderStep2() : _renderStep3()) + '</div>' +
      '<div class="pd-footer">' + _renderFooter() + '</div>' +
      '</div>';
    _bind();
  }

  function _renderFooter() {
    if (_step === 1) {
      return '<button class="pd-btn-cancel" onclick="PlotDesigner._close()">取消</button>' +
             '<button class="pd-btn-next" id="pd-btn-next" onclick="PlotDesigner._goNext()">下一步 → AI 生成骨架</button>';
    }
    if (_step === 2) {
      return '<button class="pd-btn-back" id="pd-btn-back" onclick="PlotDesigner._goBack()">← 返回修改</button>' +
             '<button class="pd-btn-next" id="pd-btn-save" onclick="PlotDesigner._goSave()">保存并进入下一步 →</button>';
    }
    return '<button class="pd-btn-back" id="pd-btn-back3" onclick="PlotDesigner._goBack2()">← 返回上一步</button>' +
           '<button class="pd-btn-primary" id="pd-btn-apply" onclick="PlotDesigner._doApply()">✅ 应用到本章</button>';
  }

  function _renderStep1() {
    return '' +
      '<div class="pd-section-label">主角方</div>' +
      '<label class="pd-label">人物名称</label>' +
      '<input class="pd-input" id="pd-hero" placeholder="例：叶寒" value="' + esc(_data.hero || '') + '">' +
      '<label class="pd-label">目的：想要什么结果</label>' +
      '<input class="pd-input" id="pd-hero-goal" placeholder="例：套出国师的真实立场" value="' + esc(_data.heroGoal || '') + '">' +
      '' +
      '<div class="pd-section-label">对手方</div>' +
      '<label class="pd-label">人物名称</label>' +
      '<input class="pd-input" id="pd-rival" placeholder="例：国师" value="' + esc(_data.rival || '') + '">' +
      '<label class="pd-label">目的：想要什么结果</label>' +
      '<input class="pd-input" id="pd-rival-goal" placeholder="例：摸清对方背后的势力" value="' + esc(_data.rivalGoal || '') + '">' +
      '' +
      '<div class="pd-section-label">博弈信息差</div>' +
      '<label class="pd-label">关键信息差（主角知道但对手不知道的）</label>' +
      '<textarea class="pd-textarea" id="pd-info-gap" rows="2" placeholder="例：叶寒已经拿到了账册副本">' + esc(_data.infoGap || '') + '</textarea>' +
      '' +
      '<div class="pd-section-label">预期结果</div>' +
      '<label class="pd-label">本章结束后谁占优，以什么方式</label>' +
      '<textarea class="pd-textarea" id="pd-expected" rows="2" placeholder="例：叶寒表面退让，实则拿到了想确认的情报">' + esc(_data.expected || '') + '</textarea>';
  }

  function _renderStep2() {
    return '' +
      '<div class="pd-section-label">🤖 AI 生成的剧情骨架</div>' +
      '<textarea class="pd-textarea pd-skeleton" id="pd-skeleton" rows="18">' + esc(_skeleton) + '</textarea>' +
      '<div class="pd-hint">骨架可直接编辑修改，编辑后点「保存并进入下一步」。</div>';
  }

  function _renderStep3() {
    var seed = _compressToSeed();
    return '' +
      '<div class="pd-section-label">📝 剧情种子预览（100 字以内）</div>' +
      '<textarea class="pd-textarea" id="pd-seed" rows="3">' + esc(seed) + '</textarea>' +
      '<div class="pd-hint">点击「应用到本章」自动填入章节 summary 字段，完整骨架存入 notes。</div>';
  }

  function _compressToSeed() {
    // 优先用结构化数据的 title + coreConflict
    if (_skeletonData) {
      var s = _skeletonData;
      var text = (s.title || "") + "。" + (s.coreConflict || "");
      var cleaned = text.replace(/\n+/g, "。").replace(/。+/g, "。");
      if (cleaned.length <= 100) return cleaned;
      var cutoff = cleaned.lastIndexOf("。", 99);
      return cutoff > 50 ? cleaned.slice(0, cutoff + 1) : cleaned.slice(0, 99) + "…";
    }
    // Fallback: from textarea
    var taVal = (document.getElementById("pd-skeleton") ? document.getElementById("pd-skeleton").value : "") || _skeleton;
    if (!taVal) return "（无骨架数据）";
    var lines = taVal.split("\n");
    var firstLine = "";
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].replace(/[#*\-【】]/g, "").trim();
      if (ln && ln.length > 2) {
        firstLine = ln;
        break;
      }
    }
    return firstLine.slice(0, 100) || "（无骨架数据）";
  }

  // ═══════════════════════════════════
  //  Binding
  // ═══════════════════════════════════

  function _bind() {
    if (!_overlay) return;
    // All buttons use inline onclick, only Escape key needs binding here
    _overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  // ═══════════════════════════════════
  //  Logic
  // ═══════════════════════════════════

  function _goStep2() {
    if (_submitting) {
      console.log("[PlotDesigner] _goStep2 blocked: _submitting=true");
      return;
    }

    try {
      _data.hero = (document.getElementById("pd-hero") || {}).value || "";
      _data.heroGoal = (document.getElementById("pd-hero-goal") || {}).value || "";
      _data.rival = (document.getElementById("pd-rival") || {}).value || "";
      _data.rivalGoal = (document.getElementById("pd-rival-goal") || {}).value || "";
      _data.infoGap = (document.getElementById("pd-info-gap") || {}).value || "";
      _data.expected = (document.getElementById("pd-expected") || {}).value || "";

      console.log("[PlotDesigner] _goStep2 hero=" + JSON.stringify(_data.hero) + " rival=" + JSON.stringify(_data.rival));

      if (!_data.hero || !_data.rival) {
        _showToast("请至少填写主角方和对手方的名称");
        return;
      }

      _step = 2;
      _render();
      _callAI();
    } catch (e) {
      console.error("[PlotDesigner] _goStep2 error:", e);
      _showToast("系统错误：" + e.message);
    }
  }

  function _callAI() {
    _submitting = true;

    var skeletonEl = document.getElementById("pd-skeleton");
    if (skeletonEl) {
      skeletonEl.value = "⏳ 正在分析博弈关系并生成剧情骨架…";
      skeletonEl.disabled = true;
    }

    // Disable navigation buttons during generation
    var backBtn = document.getElementById("pd-btn-back");
    if (backBtn) backBtn.disabled = true;

    console.log("[PlotDesigner] calling /api/generate with protagonist=" + _data.hero + " opponent=" + _data.rival);

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "plot_designer",
        protagonistName: _data.hero,
        protagonistGoal: _data.heroGoal,
        opponentName: _data.rival,
        opponentGoal: _data.rivalGoal,
        informationGap: _data.infoGap,
        expectedOutcome: _data.expected,
      }),
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.error || "HTTP " + res.status);
        }).catch(function () {
          throw new Error("HTTP " + res.status);
        });
      }
      return res.json();
    })
    .then(function (result) {
      if (!result.success) {
        throw new Error(result.error || "生成失败");
      }

      _skeletonData = result.data.skeleton;
      _skeleton = formatSkeletonForDisplay(result.data.skeleton);

      if (skeletonEl) {
        skeletonEl.value = _skeleton;
        skeletonEl.disabled = false;
      }

      _showToast("✅ 剧情骨架已生成");
    })
    .catch(function (err) {
      console.error("[PlotDesigner] AI 生成失败:", err.message);
      _showToast("❌ " + err.message);

      if (skeletonEl) {
        skeletonEl.value = "AI 生成失败: " + err.message + "\n\n请返回修改参数后重试，或手动输入骨架。";
        skeletonEl.disabled = false;
      }
    })
    .finally(function () {
      _submitting = false;
      if (backBtn) backBtn.disabled = false;
    });
  }

  /**
   * 将结构化骨架 JSON 格式化为可读文本（用于 textarea 显示）
   */
  function formatSkeletonForDisplay(skeleton) {
    if (!skeleton) return "";
    var beats = Array.isArray(skeleton.plotBeats) ? skeleton.plotBeats : [];
    var lines = [
      "【标题】" + (skeleton.title || ""),
      "",
      "【核心冲突】",
      skeleton.coreConflict || "",
      "",
      "【主角策略】",
      skeleton.protagonistStrategy || "",
      "",
      "【对手策略】",
      skeleton.opponentStrategy || "",
      "",
      "【剧情节拍】",
      beats.map(function (b, i) { return (i + 1) + ". " + b; }).join("\n"),
      "",
      "【转折点】",
      skeleton.turningPoint || "",
      "",
      "【收尾状态】",
      skeleton.endingState || "",
      "",
      "【悬念钩子】",
      skeleton.unresolvedHook || "",
    ];

    // 增强字段（richness >= 1）
    if (skeleton.dialogueHooks && skeleton.dialogueHooks.length) {
      lines.push("", "【关键对话线索】");
      skeleton.dialogueHooks.forEach(function (d, i) { lines.push((i + 1) + ". " + d); });
    }
    if (skeleton.emotionalArc) {
      lines.push("", "【情绪曲线】", skeleton.emotionalArc);
    }
    if (skeleton.sceneBreakdown && skeleton.sceneBreakdown.length) {
      lines.push("", "【场景细分】");
      skeleton.sceneBreakdown.forEach(function (s, i) {
        lines.push((i + 1) + ". " + (s.scene || s.title || "场景" + (i+1)));
        if (s.location) lines.push("   地点：" + s.location);
        if (s.focus) lines.push("   焦点：" + s.focus);
        if (s.description) lines.push("   " + s.description);
      });
    }

    // 深度字段（richness >= 2）
    if (skeleton.pacingNotes) {
      lines.push("", "【节奏建议】", skeleton.pacingNotes);
    }
    if (skeleton.foreshadowing && skeleton.foreshadowing.length) {
      lines.push("", "【伏笔清单】");
      skeleton.foreshadowing.forEach(function (f, i) { lines.push((i + 1) + ". " + f); });
    }

    return lines.join("\n");
  }

  function _apply() {
    var seedEl = document.getElementById("pd-seed");
    var finalSeed = seedEl ? seedEl.value.trim() : _compressToSeed();
    var finalSkeleton = _skeleton;

    if (!_chapterId || !_projectId) {
      _showToast("未找到当前章节");
      return;
    }

    // 写 summary 种子
    var body = { summary: finalSeed };

    // 完整骨架作为 UnifiedItem（plot_skeleton 类型）存下来
    var skeletonPromise = finalSkeleton
      ? fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: _projectId,
            type: "plot_skeleton",
            name: "【剧情骨架】" + (_data.hero || "") + " vs " + (_data.rival || ""),
            summary: finalSeed,
            description: finalSkeleton,
            tags: ["AI生成", "剧情骨架", "plot_designer"],
            attrs: {
              ruleCategory: "剧情设计",
              chapterId: _chapterId,
              protagonistName: _data.hero,
              opponentName: _data.rival,
              structuredData: _skeletonData,
            },
          }),
        }).then(function (r) { return r.json(); })
      : Promise.resolve(null);

    // PUT chapter update
    fetch("/api/projects/" + encodeURIComponent(_projectId) + "/chapters/" + encodeURIComponent(_chapterId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    .then(function (r) { return r.json(); })
    .then(function (result) {
      if (!result.success) throw new Error(result.error || "更新失败");
      return skeletonPromise;
    })
    .then(function () {
      close();
      _showToast("✅ 剧情种子已应用到本章");
      var ch = LayoutSkill.getActiveChapter();
      if (ch) ch.summary = finalSeed;
      LayoutSkill.selectProject(_projectId);
    })
    .catch(function (err) {
      _showToast("更新失败: " + err.message);
    });
  }

  // ═══════════════════════════════════
  //  Public API
  // ═══════════════════════════════════

  function show(chapterId, projectId, prefill) {
    // 先关闭已有 overlay，防止重复创建导致 DOM ID 冲突
    if (_overlay) {
      close();
    }

    _chapterId = chapterId;
    _projectId = projectId;
    _step = 1;
    _data = prefill || {};
    _skeleton = "";
    _skeletonData = null;
    _submitting = false;

    _overlay = document.createElement("div");
    _overlay.className = "novelos-modal-overlay";
    _overlay.addEventListener("click", function (e) {
      if (e.target === _overlay) close();
    });
    document.body.appendChild(_overlay);
    _render();
  }

  return {
    show: show,
    _close: close,
    _goNext: _goStep2,
    _goBack: function () { _step = 1; _render(); },
    _goSave: function () {
      _skeleton = document.getElementById("pd-skeleton").value;
      _step = 3; _render();
    },
    _goBack2: function () { _step = 2; _render(); },
    _doApply: _apply,
  };
})();
