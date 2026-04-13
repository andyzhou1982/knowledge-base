# Findings & Decisions

## Requirements
- 开发一个知识库系统，docs 目录存放所有 Markdown 文件
- 使用 Markdown 解析器查看文件详情
- 支持 BM25 算法的搜索功能
- 左侧树状结构展示 docs 目录的文件夹和文件
- 点击文件后右侧查看文件详情
- 无需上传功能，文件由人工放入 docs 目录
- 支持代码块语法高亮
- 技术栈：React + TypeScript + Antd + markdown-it

## Research Findings

### 架构方案
- **纯前端方案**：构建时扫描 docs 目录，生成文件索引 JSON，运行时 fetch 加载 md 内容
- **推荐方案**：自定义 Vite 插件，扫描 docs 目录生成索引，构建时将 docs 目录作为 public 资源

### BM25 搜索
- 选定库：**wink-bm25-text-search** — 支持 Node + 浏览器，API 简洁，生产级验证
- 构建时由 Vite 插件调用分词 + wink-bm25 建立索引，输出 JSON 供前端查询
- 前端运行时零计算负担，只做关键词查询

### 中文分词
- 原选：nodejieba — Windows 上 node-gyp 编译失败，需 Visual Studio C++ 构建工具
- 备选方案待确认

### Markdown 渲染
- markdown-it 支持插件扩展
- 配合 highlight.js 实现代码高亮：`markdown-it({ highlight: function(str, lang) {...} })`
- 样式方案：github-markdown-css 提供 GitHub 风格渲染

### 文件树实现
- antd Tree 组件支持 `treeData` 属性，可动态构建
- 需要一个函数将文件路径列表转换为树状结构
- `DirectoryTree` 变体更适合文件浏览场景

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Vite 自定义插件生成索引 | 自动化扫描，无需手动维护文件列表 |
| github-markdown-css | 熟悉的 GitHub 风格，用户接受度高 |
| antd DirectoryTree | 专门用于文件系统浏览，自带图标和交互 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| nodejieba 安装失败 (Windows 无 VS C++ 工具) | 待确认替代方案 |

## Resources
- markdown-it: https://github.com/markdown-it/markdown-it
- highlight.js: https://highlightjs.org/
- antd Tree: https://ant.design/components/tree-cn/
- wink-bm25-text-search: https://www.npmjs.com/package/wink-bm25-text-search

## Visual/Browser Findings
- (暂无)

---
*Update this file after every 2 view/browser/search operations*
