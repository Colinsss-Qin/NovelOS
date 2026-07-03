# NovelOS 项目规约

## 1. 代码风格

### 模块声明
- 前端模块使用 IIFE 包裹，公共 API 挂载到 `window`：
  ```js
  (function () {
    function init() { ... }
    window.ModuleName = { init: init };
  })();
  ```
- 后端模块使用 CommonJS：`module.exports = router` 或 `module.exports = { fn }`。
- 子组件使用 `var ComponentName = { ... }` 对象字面量，**禁止**使用箭头函数 `() => {}`（兼容旧浏览器）。

### 命名规范
- **文件**：模块入口统一 `index.js`，子组件 PascalCase（`MapCore.js`），工具类 kebab-case（`knowledge-skill/`）。
- **CSS 类名**：模块前缀 + 语义名，kebab-case。例：`.sm-map-wrap`（story-map）、`.sb-layout`（story-bible）。
- **JS 变量/函数**：camelCase。事件回调以 `_on` 开头（`_onTypeChange`），内部函数以 `_` 开头（`_renderLayout`）。

### 目录结构
```
public/modules/<module-name>/
├── index.js            ← 主控制器，挂载 window API
├── styles.css          ← 模块样式
└── components/         ← 子组件（每个一个 .js 文件）

src/modules/<module-name>/
└── index.js            ← 后端 Express Router

src/skills/<skill-name>/
├── index.js            ← 入口
├── types.js            ← 枚举/常量（可选）
└── providers/          ← 多实现（AI providers 等）
```

## 2. 组件设计

### 每个组件必须实现
```js
var ComponentName = {
  el: null,             // DOM 引用缓存

  init: function (containerId) {
    this.el = document.getElementById(containerId);
    if (!this.el) return;  // ← 必须 null check
    // ...
  },

  render: function (data) {
    if (!this.el) { console.warn("Component.render: container not found"); return; }
    // ...
  }
};
```

### 防御性规则
- `init()` 必须检查容器是否存在，不存在时静默返回（不抛异常）。
- `render()` 必须在 `this.el` 存在的前提下操作 DOM。
- 所有 `querySelector()` 返回值使用前必须 null check。
- `innerHTML` 设置后如需绑定事件，使用**事件委托**（在容器上监听，而非子元素），避免 `innerHTML` 覆盖导致事件丢失。

### CSS 约定
- 模块前缀避免冲突：Story Bible = `sb-`，Story Map = `sm-`，Layout = 无前缀。
- 深色主题色板固定：
  - 背景：`#0b0a12`（最深）、`#14131e`（面板）、`#1e1d30`（卡片）
  - 边框：`#252336`、`#333`
  - 文字：`#d0cec8`（主）、`#8a8798`（辅）、`#6b6880`（弱）
  - 强调：`#d4a574`（金色主色）、`#c06060`（危险）
- 滚动条统一样式：`width:5px; thumb:#333; radius:3px`

## 3. 数据层规范

- **全部设定数据从数据库/存储读取，禁止硬编码**（演示数据除外，须标注 `// demo only`）。
- AI 生成时必须注入相关设定（标签匹配），避免上下文溢出。
- AI 调用必须包含错误处理与日志。
- 前端持久化使用 `localStorage`，key 格式：`<module>-<projectId>`。

## 4. Git 规范

- 提交格式：`<type>: <中文描述>`（如 `feat: 添加故事地图模块`）。
- 禁止提交：`.env`、`node_modules/`、`data/*.db`、`/memory/`。
- 修改前如涉及多文件，先说明改动范围。
- 不自动 commit 或 push，除非用户明确要求。

## 5. AI 协作规范

### 修改前
- 先说明改动范围（涉及哪几个文件、改动性质）。
- 涉及删除文件/目录、修改 `.env`、执行 `git push` 等操作必须先确认。

### 修改后
- 运行语法检查：`node -e "require('vm').Script(fs.readFileSync('file.js','utf8'))"` 验证无 SyntaxError。
- 涉及前端模块的，验证所有 JS 文件可被静态加载（HTTP 200）。
- 涉及后端模块的，重启服务并用 `curl` 验证端点返回正确 JSON。

### 对抗性测试基线
每个模块至少验证：
1. **空输入**：空容器、空数据、缺失必填字段 → 不崩溃
2. **双次 init**：同一容器调用两次 init → 不重复、不崩溃
3. **持久化**：数据写入 → 刷新恢复 → 数据一致
4. **降级**：异常数据/网络错误 → 展示友好提示，不白屏

## 6. 版本范围

- V1（当前阶段）：Story Bible · Story Map · War Room · Writing Studio · Future Scene
- V2 功能（编译器/世界状态自动演化）**本阶段不做**，严禁范围蔓延。
- 新模块必须先在 `docs/` 下产出设计文档（Plan Mode），再实现代码。

## 7. 配置文件

| 文件 | 用途 | 提交？ |
|------|------|--------|
| `.env` | API 密钥 | ❌ |
| `project.config.json` | 端口/数据库路径/默认模型 | ✅ |
| `.settings.local.json` | IDE 权限配置 | ❌ |
| `CLAUDE.md` | 项目说明（给 AI 看） | ✅ |
| `project_rules.md` | 本文件 | ✅ |
