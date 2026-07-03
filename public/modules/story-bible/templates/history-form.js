StoryBibleTemplates["history_event"] = {
  type: "history_event", title: "历史事件",
  fields: [
    { key: "name", label: "事件名称", type: "text", required: true, placeholder: "事件名称", section: "basic" },
    { key: "attrs.era", label: "时代/纪元", type: "text", placeholder: "如：太古纪元、第3章", section: "basic" },
    { key: "summary", label: "事件摘要", type: "textarea", rows: 4, required: true, placeholder: "简述事件经过", section: "basic" },
    { key: "description", label: "详细描述", type: "textarea", rows: 6, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：大战、转折", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
