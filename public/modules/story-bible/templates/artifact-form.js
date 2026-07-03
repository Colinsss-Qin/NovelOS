StoryBibleTemplates["artifact"] = {
  type: "artifact", title: "宝物",
  fields: [
    { key: "name", label: "名称", type: "text", required: true, placeholder: "宝物名称", section: "basic" },
    { key: "attrs.artifactType", label: "类型", type: "select", required: true, options: ["武器","防具","法宝","灵药","材料","秘籍","其他"], section: "basic" },
    { key: "attrs.grade", label: "品阶", type: "select", options: ["凡品","灵品","仙品","神品","未知"], section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话描述", section: "basic" },
    { key: "attrs.origin", label: "来历", type: "textarea", rows: 2, placeholder: "宝物的来源和历史", section: "detail" },
    { key: "attrs.abilities", label: "特殊能力", type: "tags-input", placeholder: "如：增幅灵力、自动修复", section: "detail" },
    { key: "attrs.restrictions", label: "使用限制", type: "text", placeholder: "如：仅剑修可用", section: "detail" },
    { key: "description", label: "详细描述", type: "textarea", rows: 4, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：上古、绑定", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
