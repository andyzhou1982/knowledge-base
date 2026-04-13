# Task Plan: 知识库系统

## Goal
构建一个基于 React + TypeScript + Antd + markdown-it 的知识库系统，支持树状目录浏览、Markdown 渲染（含语法高亮）和 BM25 搜索功能。

## Current Phase
Phase 2

## Phases

### Phase 1: Requirements & Discovery
- [x] 阅读 user_req.md，理解需求
- [x] 分析技术栈可行性
- [x] 记录需求到 findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定项目结构和组件划分
- [x] 设计数据流和接口
- [x] 明确依赖包清单
- [x] 创建项目脚手架 (Vite + React + TS)
- [x] 解决 nodejieba 安装问题 → 改用 @node-rs/jieba
- **Status:** complete

### Phase 3: Implementation - Core Framework
- [x] 安装依赖 (antd, markdown-it, highlight.js, @node-rs/jieba, wink-bm25-text-search 等)
- [x] 搭建基础布局 (左右分栏：Sider + Content)
- [x] 创建示例 docs 目录和测试文件 (4个示例文档)
- **Status:** complete

### Phase 4: Implementation - File Tree Component
- [x] 实现 docs 目录的树状结构读取
- [x] 使用 antd DirectoryTree 组件展示文件树
- [x] 实现文件点击选中逻辑
- [x] 支持展开/折叠文件夹
- **Status:** complete

### Phase 5: Implementation - Markdown Viewer
- [x] 集成 markdown-it 渲染引擎
- [x] 集成 highlight.js 实现代码块语法高亮
- [x] 添加 Markdown 样式 (github-markdown-css)
- [x] 处理图片和链接的相对路径
- **Status:** complete

### Phase 6: Implementation - BM25 Search
- [x] 集成 @node-rs/jieba 分词 + BM25 算法
- [x] Vite 插件：构建时扫描 docs，分词并建索引
- [x] 实现搜索输入和结果展示 UI
- [ ] 支持搜索结果高亮和定位
- **Status:** complete

### Phase 7: Integration & Polish
- [x] 整合所有组件
- [x] 添加加载状态和错误处理
- [ ] 响应式布局适配
- [ ] 最终测试验证
- **Status:** in_progress

## Key Questions
1. docs 目录的文件如何被前端读取？ → Vite 插件构建时扫描生成索引 JSON，md 文件放入 public/docs/
2. BM25 中文分词如何处理？ → 构建时分词 + BM25 建索引，前端只查询
3. 是否需要路由？ → 单页应用，不需要 React Router，用状态管理即可
4. nodejieba 编译失败怎么办？ → 待确认替代方案

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Vite 作为构建工具 | 快速开发体验，原生 TS 支持 |
| 构建时生成 docs 索引 | 纯前端方案，无需后端 |
| highlight.js 做语法高亮 | 与 markdown-it 深度集成，支持多语言 |
| 构建时预计算搜索索引 | 分词和索引在 Node 环境完成，前端只需查询 |
| antd DirectoryTree | 专门用于文件系统浏览，自带图标和交互 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| nodejieba 安装失败 (node-gyp/VS not found) | 1 | 改用 @node-rs/jieba，预编译二进制无需本地编译 |
| antd DirectoryTreeProps 导入错误 | 1 | 改用 DataNode 类型 |

## Notes
- 项目为纯前端应用，所有 md 文件在构建时内联或通过 fetch 加载
- BM25 索引由 Vite 插件在构建时预计算，输出 public/search-index.json
- Vite 脚手架已创建，需继续安装业务依赖
