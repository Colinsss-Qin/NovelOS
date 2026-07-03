/* ================================================================
   ImageGenerator — 上传地形图 → AI 视觉识别 → GeoJSON
   V1: 演示模式生成示例特征（视觉 API 需要多模态模型支持）
   ================================================================ */

var ImageGenerator = {
  el: null,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    this._render();
  },

  _render: function () {
    if (!this.el) return;
    this.el.innerHTML =
      '<div class="sm-upload-area" id="sm-upload-area">' +
      '<span class="sm-upload-icon">🖼️</span>' +
      "点击上传地形图 / 手绘图<br>" +
      '<span style="font-size:10px;color:#555">支持 .png .jpg .webp</span>' +
      '<input type="file" accept="image/*" id="sm-file-input" style="display:none">' +
      "</div>" +
      '<img class="sm-upload-preview" id="sm-upload-preview" alt="预览">' +
      '<button class="sm-generate-btn" id="sm-img-gen-btn" style="display:none">🤖 AI 识别并生成标记</button>' +
      '<div class="sm-loading" id="sm-img-loading" style="display:none">⏳ 正在分析地形特征…</div>';

    this._bind();
  },

  _bind: function () {
    var self = this;
    var uploadArea = document.getElementById("sm-upload-area");
    var fileInput = document.getElementById("sm-file-input");
    var genBtn = document.getElementById("sm-img-gen-btn");

    if (uploadArea && fileInput) {
      uploadArea.addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function (e) {
        self._handleFile(e.target.files[0]);
      });

      // Drag & drop
      uploadArea.addEventListener("dragover", function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = "#d4a574";
      });
      uploadArea.addEventListener("dragleave", function () {
        uploadArea.style.borderColor = "";
      });
      uploadArea.addEventListener("drop", function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = "";
        var file = e.dataTransfer.files[0];
        if (file) self._handleFile(file);
      });
    }

    if (genBtn) {
      genBtn.addEventListener("click", function () {
        self.generate();
      });
    }
  },

  _handleFile: function (file) {
    if (!file || !file.type.startsWith("image/")) {
      LayoutSkill.showToast("请选择图片文件");
      return;
    }

    var self = this;
    var reader = new FileReader();
    reader.onload = function (e) {
      self._imageDataUrl = e.target.result;
      var preview = document.getElementById("sm-upload-preview");
      var genBtn = document.getElementById("sm-img-gen-btn");
      var uploadArea = document.getElementById("sm-upload-area");

      if (preview) {
        preview.src = self._imageDataUrl;
        preview.style.display = "block";
      }
      if (genBtn) genBtn.style.display = "block";
      if (uploadArea) uploadArea.classList.add("has-file");
    };
    reader.readAsDataURL(file);
  },

  /** Generate features from uploaded image (V1: demo mode) */
  generate: function () {
    if (!this._imageDataUrl) {
      LayoutSkill.showToast("请先上传图片");
      return;
    }

    var loadingEl = document.getElementById("sm-img-loading");
    var genBtn = document.getElementById("sm-img-gen-btn");
    if (loadingEl) loadingEl.style.display = "flex";
    if (genBtn) genBtn.disabled = true;

    var self = this;

    // V1: Use demo generator (vision API requires multimodal model)
    // In future: POST the base64 image to /api/generate with a vision system prompt
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "setting_expand",
        userPrompt:
          "请根据这张虚构世界的地形图，分析其中的地理特征并生成 GeoJSON。识别山脉、河流、湖泊、森林、城市等。",
        maxTokens: 4096,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";
        var result = "";

        function read() {
          reader.read().then(function (chunk) {
            if (chunk.done) {
              self._processImageResult(result);
              return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";
            lines.forEach(function (line) {
              if (!line.startsWith("data: ")) return;
              try {
                var json = JSON.parse(line.slice(6));
                if (json.token) result += json.token;
              } catch (e) {}
            });
            read();
          });
        }
        read();
      })
      .catch(function () {
        // Fallback to demo features
        self._processImageResult("demo");
      });
  },

  _processImageResult: function (raw) {
    var loadingEl = document.getElementById("sm-img-loading");
    var genBtn = document.getElementById("sm-img-gen-btn");
    if (loadingEl) loadingEl.style.display = "none";
    if (genBtn) genBtn.disabled = false;

    // V1: Always use demo features for image mode
    // The text AI can't actually see images yet
    var features = [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-60, 30],[30, 40],[60, -10],[0, -30],[-80, -20],[-60, 30]]] },
        properties: { name: "识别大陆轮廓", type: "continent", description: "从图片中识别的大陆轮廓" },
      },
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[-40, 20],[-20, 25],[10, 20],[30, 15]] },
        properties: { name: "识别山脉", type: "mountain", description: "图片中识别的山脉走向" },
      },
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[-30, 30],[-20, 10],[-10, -5],[10, -15]] },
        properties: { name: "识别河流", type: "river", description: "图片中识别的主要河流" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[20, -5],[40, -10],[50, 5],[30, 10],[20, -5]]] },
        properties: { name: "识别森林", type: "forest", description: "图片中识别的大片森林" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-50, 25] },
        properties: { name: "识别城市标记", type: "city", description: "图片中标记的城市位置" },
      },
    ];

    GeoLayer.render({ type: "FeatureCollection", features: features });
    StoryMap.saveToStorage();
    LayoutSkill.showToast("✅ 已生成 " + features.length + " 个地形标记（演示模式）");
  },
};
