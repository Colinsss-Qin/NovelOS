StoryBibleTemplates["faction"] = {
  type: "faction", title: "势力",
  fields: [
    { key: "name", label: "名称", type: "text", required: true, placeholder: "势力名称", section: "basic" },
    { key: "attrs.factionType", label: "类型", type: "select", required: true, options: ["国家","宗门","家族","组织","商会","其他"], section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话概括", section: "basic" },
    { key: "attrs.influence", label: "影响力 (0-100)", type: "number", min: 0, max: 100, section: "power" },
    { key: "attrs.military", label: "军事实力 (0-100)", type: "number", min: 0, max: 100, section: "power" },
    { key: "attrs.economy", label: "经济实力 (0-100)", type: "number", min: 0, max: 100, section: "power" },
    { key: "attrs.resources", label: "资源描述", type: "text", placeholder: "如：灵石矿脉、炼丹传承", section: "detail" },
    { key: "description", label: "详细描述", type: "textarea", rows: 4, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：正道、上古传承", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "power", label: "势力评估", icon: "📊" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
