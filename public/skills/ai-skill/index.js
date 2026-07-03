/* ================================================================
   AI Skill / Generation Pipeline (Public API)
   Orchestrates PromptManager → ContextBuilder → HTTP Provider → SSE stream.
   Exposed as window.AISkill.
   ================================================================ */

(function () {

  // ==============================================================
  //  HTTP PROVIDER — calls server /api/generate endpoint
  // ==============================================================

  /**
   * Call the server-side generation endpoint and return an SSE reader.
   * @param {object} opts
   * @param {string} opts.systemPrompt
   * @param {string} opts.userPrompt
   * @param {object} opts.params — { temperature, maxTokens, provider }
   * @returns {Promise<ReadableStream>}
   */
  function callGenerateAPI(opts) {
    return fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: opts.systemPrompt,
        userPrompt:   opts.userPrompt,
        temperature:  opts.params.temperature || 0.7,
        maxTokens:    opts.params.maxTokens || 4096,
        provider:     opts.params.provider || null
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.error || "Generation failed (HTTP " + res.status + ")");
        });
      }
      return res.body.getReader();
    });
  }

  /**
   * Read SSE stream from a ReadableStream reader.
   * Yields tokens via onToken callback.
   * @param {ReadableStreamDefaultReader} reader
   * @param {function(string):void} onToken
   * @returns {Promise<string>} full text
   */
  function readSSEStream(reader, onToken) {
    var decoder = new TextDecoder();
    var buffer = "";
    var fullText = "";

    function pump() {
      return reader.read().then(function (result) {
        if (result.done) return fullText;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line.indexOf("data: ") !== 0) continue;
          var data = line.slice(6);

          try {
            var json = JSON.parse(data);
            if (json.token) {
              fullText += json.token;
              if (onToken) onToken(json.token);
            }
            if (json.done) return fullText;
            if (json.error) throw new Error(json.error);
          } catch (e) {
            if (e.message && e.message.indexOf("json") === -1) throw e;
            // skip malformed JSON chunks
          }
        }

        return pump();
      });
    }

    return pump();
  }

  // ==============================================================
  //  PIPELINE
  // ==============================================================

  /**
   * Run the full generation pipeline.
   * @param {object} opts
   * @param {string} opts.task          — AITask value (required)
   * @param {object} opts.chapter       — current chapter object (required)
   * @param {string} opts.projectId
   * @param {string} opts.projectName
   * @param {string} opts.projectGenre
   * @param {string} [opts.selectedText] — for rewrite/polish
   * @param {string} [opts.targetType]   — for outline_generate
   * @param {string} [opts.provider]
   * @param {function(string):void} opts.onToken
   * @param {function(string):void} opts.onComplete
   * @param {function(Error):void} opts.onError
   */
  function generate(opts) {
    var task    = opts.task;
    var chapter = opts.chapter;

    if (!task) {
      if (opts.onError) opts.onError(new Error("task is required"));
      return;
    }

    // Check template exists
    var tmpl = PromptManager.getTemplate(task);
    if (!tmpl) {
      if (opts.onError) opts.onError(new Error("No template for task: " + task));
      return;
    }

    // 1. Build context
    var ctx = ContextBuilder.build({
      task:         task,
      projectId:    opts.projectId,
      chapter:      chapter,
      selectedText: opts.selectedText,
      projectName:  opts.projectName,
      projectGenre: opts.projectGenre,
      targetType:   opts.targetType
    });

    // 2. Get defaults
    var defs = PromptManager.getDefaults(task);

    // 3. Call API
    callGenerateAPI({
      systemPrompt: ctx.systemPrompt,
      userPrompt:   ctx.userPrompt,
      params: {
        temperature: defs.temperature,
        maxTokens:   defs.maxTokens,
        provider:    opts.provider
      }
    }).then(function (reader) {
      return readSSEStream(reader, opts.onToken);
    }).then(function (fullText) {
      if (opts.onComplete) opts.onComplete(fullText);
    }).catch(function (err) {
      if (opts.onError) opts.onError(err);
    });
  }

  // ==============================================================
  //  PUBLIC API
  // ==============================================================
  window.AISkill = {
    // Pipeline
    generate: generate,

    // Sub-modules (accessible for debugging / custom use)
    prompts:   PromptManager,
    context:   ContextBuilder,

    // Task registry
    tasks:     AITask,
    taskLabel: AITaskLabel,

    // Utility
    estimateTokens: ContextBuilder.estimateTokens
  };

})();
