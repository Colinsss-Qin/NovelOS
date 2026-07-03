/* ================================================================
   AI Skill / Prompt Manager
   Template registry, variable substitution, version control.
   Templates are registered by individual prompt/*.js files.
   ================================================================ */

// Global registry — prompt/*.js files call AISkillPrompts[key] = {...}
var AISkillPrompts = {};

var PromptManager = {

  /**
   * Register a prompt template. Called by prompt/*.js files at load time.
   */
  register: function (template) {
    if (!template || !template.task) return false;
    AISkillPrompts[template.task] = template;
    return true;
  },

  /**
   * Get the active template for a task.
   * @param {string} task
   * @returns {object|undefined}
   */
  getTemplate: function (task) {
    return AISkillPrompts[task];
  },

  /**
   * Render a template by replacing {{variable}} placeholders.
   * Supports nested paths like {{context.characters}}.
   * @param {string} task
   * @param {object} vars — flat key-value map of variables
   * @returns {{ system: string, user: string }}
   */
  render: function (task, vars) {
    var tmpl = AISkillPrompts[task];
    if (!tmpl) {
      console.warn("PromptManager: no template for task:", task);
      return { system: "", user: "" };
    }

    vars = vars || {};

    var system = _substitute(tmpl.systemTemplate, vars);
    var user   = _substitute(tmpl.userTemplate, vars);

    return { system: system, user: user };
  },

  /**
   * Get default parameters for a task.
   */
  getDefaults: function (task) {
    var tmpl = AISkillPrompts[task];
    return tmpl ? tmpl.defaults : { temperature: 0.7, maxTokens: 4096 };
  },

  /**
   * List all registered tasks.
   */
  listTasks: function () {
    return Object.keys(AISkillPrompts).map(function (k) {
      var t = AISkillPrompts[k];
      return { task: t.task, description: t.description, version: t.version };
    });
  },

  /**
   * Set active version for a task (for A/B testing).
   */
  setVersion: function (task, version) {
    // Versions not yet implemented — placeholder for future
    console.log("PromptManager: setVersion", task, version);
  }
};

// ================================================================
//  INTERNAL — variable substitution
// ================================================================

/**
 * Replace {{path.to.key}} placeholders in a template string.
 * Supports flat keys ({{name}}) and nested paths ({{project.name}}).
 * Missing variables are replaced with empty string.
 */
function _substitute(template, vars) {
  return template.replace(/\{\{([\w.]+)\}\}/g, function (match, path) {
    var value = _resolvePath(vars, path);
    return value !== undefined ? value : "";
  });
}

/**
 * Resolve a dot-separated path against a flat object.
 * For nested paths like "project.name", first tries vars["project.name"],
 * then tries vars["project"]?.name.
 */
function _resolvePath(vars, path) {
  // Direct flat key lookup (preferred — callers flatten their vars)
  if (vars[path] !== undefined) return vars[path];

  // Fallback: walk nested path
  var parts = path.split(".");
  var current = vars;
  for (var i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = current[parts[i]];
  }
  return current;
}
