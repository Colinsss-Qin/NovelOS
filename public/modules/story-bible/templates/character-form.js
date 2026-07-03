/* Form template: Character */
StoryBibleTemplates["character"] = {
  type: "character",
  title: "角色",
  fields: [
    { key: "name", label: "姓名", type: "text", required: true, placeholder: "角色姓名", section: "basic" },
    { key: "aliases", label: "称号/别名", type: "tags-input", placeholder: "输入后回车添加", section: "basic" },
    { key: "attrs.role", label: "角色定位", type: "select", required: true, options: ["主角","配角","反派","路人"], section: "basic" },
    { key: "attrs.gender", label: "性别", type: "select", options: ["男","女","其他"], section: "basic" },
    { key: "attrs.age", label: "年龄", type: "number", min: 0, max: 9999, section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话概括角色", section: "basic" },
    { key: "attrs.personality", label: "性格", type: "textarea", rows: 3, required: true, placeholder: "描述角色的性格特点", section: "detail" },
    { key: "attrs.appearance", label: "外貌", type: "textarea", rows: 2, placeholder: "外貌特征", section: "detail" },
    { key: "attrs.background", label: "背景故事", type: "textarea", rows: 4, placeholder: "角色的过往经历", section: "detail" },
    { key: "attrs.arc", label: "成长弧线", type: "textarea", rows: 3, placeholder: "角色在故事中的成长轨迹", section: "detail" },
    { key: "attrs.abilities", label: "能力/功法", type: "tags-input", placeholder: "如：天剑诀、炼丹术", section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：主角、剑修", section: "meta" },
    { key: "attrs.status", label: "状态", type: "select", options: ["active","deceased","archived"], section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细设定", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
