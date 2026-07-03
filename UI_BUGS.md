# UI Bugs

## 已修复
- [x] 导航栏遮挡正文内容（所有页面）— `#app` 缺少 `padding-top:44px`，已添加并清理各模块冗余 padding

## 待修复 UI 问题
- [ ] 故事地图模块 Leaflet 地图容器可能未正确填充父级高度
- [ ] 部分模块空状态未统一使用 `fs-empty` / `ob-empty` 等样式
- [ ] 导航栏 `active` 状态在页面刷新后可能丢失（无 localStorage 持久化）
- [ ] toast 提示有时被模态框遮挡（`z-index:999` vs 模态 `z-index:1000`）
