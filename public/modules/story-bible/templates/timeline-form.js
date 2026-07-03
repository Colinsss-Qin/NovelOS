StoryBibleTemplates["timeline_node"] = {
  type: "timeline_node", title: "时间线节点",
  fields: [
    { key: "name", label: "节点名称", type: "text", required: true, placeholder: "节点名称", section: "basic" },
    { key: "attrs.timestamp", label: "时间标记", type: "text", required: true, placeholder: "如：太古纪元 第3280年 春", section: "basic" },
    { key: "attrs.sortOrder", label: "排序序号", type: "number", required: true, min: 0, section: "basic" },
    { key: "summary", label: "事件简述", type: "textarea", rows: 3, placeholder: "此时间点发生的事", section: "basic" },
    { key: "description", label: "详细描述", type: "textarea", rows: 4, section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "详细", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
