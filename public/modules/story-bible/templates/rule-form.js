StoryBibleTemplates["rule"] = {
  type: "rule", title: "规则体系",
  fields: [
    { key: "name", label: "标题", type: "text", required: true, placeholder: "规则标题", section: "basic" },
    { key: "attrs.ruleCategory", label: "分类", type: "select", required: true, options: ["修炼体系","官制","律法","货币","语言","习俗","其他"], section: "basic" },
    { key: "summary", label: "简述", type: "textarea", rows: 2, placeholder: "一句话概括", section: "basic" },
    { key: "description", label: "正文", type: "textarea", rows: 8, required: true, placeholder: "规则的详细说明（Markdown）", section: "detail" },
    { key: "tags", label: "标签", type: "tags-input", placeholder: "如：灵力、境界", section: "meta" }
  ],
  sections: [
    { key: "basic", label: "基本信息", icon: "📋" },
    { key: "detail", label: "正文", icon: "📝" },
    { key: "meta", label: "元数据", icon: "🏷️" }
  ]
};
