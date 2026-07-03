StoryBibleTemplates["technique"] = {
  type: "technique", title: "功法",
  fields: [
    { key: "name", label: "名称", type: "text", required: true, placeholder: "功法名称", section: "basic" },
    { key: "attrs.techniqueType", label: "类型", type: "select", required: true, options: ["心法","武技","法术","身法","炼丹术","阵法","其他"], section: "basic" },
    { key: "attrs.grade", label: "品阶", type: "select", options: ["凡品","灵品","仙品","神品"], section: "basic" },
    { key: "attrs.element", label: "属性", type: "select", options: ["金","木","水","火","土","风","雷","光","暗","无"], section: "basic" },
    { key: "attrs.levels", label: "层数/重数", type: "number", min: 1, max: 99, section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话概括", section: "basic" },
    { key: "attrs.effect", label: "效果描述", type: "textarea", rows: 3, placeholder: "功法的具体效果", section: "detail" },
    { key: "attrs.prerequisites", label: "修炼前提", type: "text", placeholder: "如：需凝气五层以上", section: "detail" },
    { key: "description", label: "详细描述", type: "textarea", rows: 4, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：火系、禁术", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
