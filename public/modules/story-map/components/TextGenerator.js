/* ================================================================
   TextGenerator — 文本描述 → AI 解析 → GeoJSON
   ================================================================ */

var TextGenerator = {
  el: null,
  _loading: false,

  SYSTEM_PROMPT:
    `你是一个地理数据分析师。用户会用中文描述一个虚构世界的地理特征。
请解析描述，输出一个严格的 GeoJSON FeatureCollection。

规则：
1. 每个地理特征对应一个 Feature
2. geometry 类型：Point（城市/山峰）、Polygon（湖泊/森林/沙漠/雪原/沼泽/平原/高原）、LineString（河流）
3. 每个 Feature 的 properties 必须包含：
   - "name": 地名（中文）
   - "type": 地形类型，只能是以下之一：mountain, river, lake, forest, desert, swamp, snow, city, plains, plateau
   - "description": 简短描述（可选）
4. 创建一个覆盖整个世界大陆的 Polygon，type 为 "continent"
5. 坐标范围：经度 -180 到 180，纬度 -90 到 90。尽量填充合理的地理位置。
6. 只输出 JSON，不要任何解释文字，不要 markdown 代码块标记。

示例输出：
{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,10],[0,10],[0,0]]]},"properties":{"name":"示例区域","type":"forest"}}]}`,

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;
    this._render();
  },

  _render: function () {
    if (!this.el) return;
    this.el.innerHTML =
      '<textarea class="sm-text-input" id="sm-text-desc" placeholder="描述你的世界地理，例如：&#10;大陆中央有一道环形山脉，山脉东侧是广阔的沼泽地带，西侧是沙漠，北方有连绵的雪原和冰湖，南方海岸线上分布着三座主要港口城市。"></textarea>' +
      '<button class="sm-generate-btn" id="sm-text-gen-btn">🤖 AI 解析并生成地图</button>' +
      '<div class="sm-loading" id="sm-text-loading" style="display:none">⏳ 正在分析地理描述…</div>';
    this._bind();
  },

  _bind: function () {
    var self = this;
    var btn = document.getElementById("sm-text-gen-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        self.generate();
      });
    }
  },

  /** Call AI, parse response as GeoJSON, render on map */
  generate: function () {
    var textarea = document.getElementById("sm-text-desc");
    if (!textarea) return;
    var desc = textarea.value.trim();
    if (!desc) {
      LayoutSkill.showToast("请先输入地理描述");
      return;
    }

    if (this._loading) return;
    this._loading = true;
    this._setLoading(true);

    var self = this;

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "setting_expand",
        systemPrompt: this.SYSTEM_PROMPT,
        userPrompt: "请解析以下虚构世界的地理描述，输出 GeoJSON：\n\n" + desc,
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
              self._processResult(result);
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
                if (json.error) {
                  self._setLoading(false);
                  LayoutSkill.showToast("❌ " + json.error);
                }
              } catch (e) {}
            });
            read();
          });
        }
        read();
      })
      .catch(function (err) {
        self._setLoading(false);
        LayoutSkill.showToast("❌ 请求失败: " + err.message);
      });
  },

  _processResult: function (raw) {
    this._loading = false;
    this._setLoading(false);

    // Try to extract JSON from response (may contain markdown code blocks)
    var jsonStr = raw.trim();

    // Strip markdown fences if present
    var m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) jsonStr = m[1].trim();

    // Try to find JSON object boundaries
    var startIdx = jsonStr.indexOf("{");
    var endIdx = jsonStr.lastIndexOf("}");
    if (startIdx >= 0 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
    }

    try {
      var geojson = JSON.parse(jsonStr);

      // Validate
      if (!geojson.type || !geojson.features || !Array.isArray(geojson.features)) {
        throw new Error("Invalid GeoJSON structure");
      }

      // Normalize feature properties
      geojson.features.forEach(function (f) {
        if (!f.properties) f.properties = {};
        if (!f.properties.name) f.properties.name = "未命名";
        if (!f.properties.type) f.properties.type = "default";
      });

      // Render
      GeoLayer.render(geojson);
      // Save
      StoryMap.saveToStorage();
      LayoutSkill.showToast("✅ 已生成 " + geojson.features.length + " 个地理特征");
    } catch (e) {
      console.error("GeoJSON parse error:", e.message, "Raw:", raw.slice(0, 200));
      // Fallback: create demo features from the raw text if parse fails
      console.warn("Falling back to demo features");
      var demoFeatures = TextGenerator._createDemoFeatures();
      GeoLayer.render({ type: "FeatureCollection", features: demoFeatures });
      StoryMap.saveToStorage();
      LayoutSkill.showToast("⚠️ AI 返回格式异常，已生成演示地图");
    }
  },

  /** Create demo features as fallback */
  _createDemoFeatures: function () {
    return [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-80, 40],[-40, 50],[0, 40],[20, 20],[-40, -10],[-120, -20],[-140, 30],[-80, 40]]] },
        properties: { name: "中央大陆", type: "continent", description: "世界的主大陆" },
      },
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[-70, 30],[-60, 35],[-45, 30],[-25, 20],[-15, 25]],
        },
        properties: { name: "环形山脉", type: "mountain", description: "围绕大陆中心的环形山脊" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[30, 15],[50, 5],[70, 20],[50, 40],[20, 35],[30, 15]]] },
        properties: { name: "东境大沼泽", type: "swamp", description: "东部的广阔沼泽地带" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-140, 20],[-120, 10],[-100, 25],[-120, 40],[-140, 20]]] },
        properties: { name: "西荒沙漠", type: "desert", description: "西部的无尽沙海" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-50, 65],[-20, 70],[30, 60],[0, 85],[-50, 65]]] },
        properties: { name: "北境雪原", type: "snow", description: "北方的终年冰雪之地" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-60, 35] },
        properties: { name: "皇城", type: "city", description: "大陆中央的帝国首都" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-100, 25] },
        properties: { name: "沙舟城", type: "city", description: "沙漠边缘的贸易重镇" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [40, 30] },
        properties: { name: "青云宗", type: "city", description: "东部山区的修仙宗门" },
      },
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[-55, 68],[-30, 60],[-10, 55]] },
        properties: { name: "天河", type: "river", description: "从北境流向中央大陆的主河" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[-30, 55],[-10, 58],[0, 50],[-20, 48],[-30, 55]]] },
        properties: { name: "镜湖", type: "lake", description: "中央山脉北麓的大湖" },
      },
    ];
  },

  _setLoading: function (loading) {
    var loadingEl = document.getElementById("sm-text-loading");
    var btn = document.getElementById("sm-text-gen-btn");
    if (loadingEl) loadingEl.style.display = loading ? "flex" : "none";
    if (btn) btn.disabled = loading;
  },
};
