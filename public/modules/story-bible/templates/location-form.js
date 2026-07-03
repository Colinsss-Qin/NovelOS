StoryBibleTemplates["location"] = {
  type: "location", title: "地点",
  fields: [
    { key: "name", label: "名称", type: "text", required: true, placeholder: "地点名称", section: "basic" },
    { key: "attrs.locationType", label: "类型", type: "select", required: true, options: ["大陆","国家","城市","宗门","秘境","建筑","其他"], section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话描述", section: "basic" },
    { key: "attrs.climate", label: "气候", type: "text", placeholder: "如：四季如春、终年冰雪", section: "detail" },
    { key: "attrs.resources", label: "资源", type: "text", placeholder: "如：盛产灵石", section: "detail" },
    { key: "description", label: "详细描述", type: "textarea", rows: 4, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：新手村、秘境", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
