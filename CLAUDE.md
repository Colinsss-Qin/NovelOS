## 项目名称
NovelOS — AI 创作操作系统 (V1)

# 技术栈：Node.js + SQLite + 原生前端 (无框架)

# 核心模块 (V1)：Story Bible · Story Map · Future Scene · Writing Studio · War Room

# 关键文档：PRD_v0.2.txt 和 build.js — 为需求参考文件

## 配置文件
.env — API 密钥 (DeepSeek/Claude/Kimi) 禁止提交 git
project.config.json — 项目参数 (端口/数据库路径/默认模型)

## 目录结构
text
/src/backend   — 后端逻辑
/src/frontend  — 前端界面
/docs/         — 技术设计文档 (Plan Mode 产出)
/data/         — SQLite 数据库
/memory/       — 章节摘要缓存

## Git 约定
提交格式：<type>: <描述> (如 feat: 添加人物CRUD)
禁止提交：.env、node_modules/、data/*.db

## 开发规则
Plan Mode：先产 docs/ 下的设计文档，不写业务代码
Implement Mode：按模块分批实现，每次完成后等待确认
严禁范围蔓延：V2 功能 (编译器/世界状态自动演化) 本阶段不做

## 权限 (settings.local.json)
allow：项目目录下的读写、npm/node/git 命令
deny：rm -rf、读取 .env、读取项目外文件
autoCompactThreshold：80%

## 注意
AI 调用必须包含错误处理与日志
设定数据从数据库读取，禁止硬编码
生成章节时仅注入相关设定 (标签匹配)，避免上下文溢出