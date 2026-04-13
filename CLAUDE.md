# CLAUDE.md

## 项目概述

前端知识库浏览器，用于浏览和搜索 `public/docs/` 目录下的 Markdown 文档。纯前端实现，无需后端服务。

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- Ant Design 6（UI 组件）
- markdown-it + highlight.js（Markdown 渲染 + 代码高亮）
- @node-rs/jieba（构建时中文分词）
- 手写 BM25 算法（运行时全文搜索）

## 项目结构

```
src/
  App.tsx                    # 主布局：Header + Sider(SearchBar+DocTree) + Content(MarkdownViewer)
  components/
    DocTree.tsx              # Ant Design DirectoryTree，展示文档目录
    SearchBar.tsx            # 搜索输入框 + 结果列表
    MarkdownViewer.tsx       # markdown-it 渲染 + highlight.js 代码高亮
  utils/
    search.ts                # BM25 搜索引擎实现
vite-plugin-docs.ts          # Vite 插件：构建时扫描 docs、jieba 分词、生成索引 JSON
vite.config.ts               # Vite 配置，引入 docsPlugin
public/
  docs/                      # Markdown 文档存放目录
  docs-tree.json             # 构建生成的目录树
  search-index.json          # 构建生成的搜索索引（含分词 tokens）
```

## 开发命令

- `npm run dev` — 启动开发服务器（会触发 vite-plugin-docs 重新索引）
- `npm run build` — TypeScript 编译 + Vite 构建
- `npm run lint` — ESLint 检查

## 架构要点

### 搜索机制（双阶段）

1. **构建时索引**（`vite-plugin-docs.ts`）：Vite 启动时扫描 `public/docs/`，用 jieba 分词，输出 `docs-tree.json` 和 `search-index.json`
2. **运行时查询**（`src/utils/search.ts`）：前端加载索引 JSON，对用户查询做轻量分词（英文按空格分割，中文 bigram），然后用 BM25 算法计算相关性评分并排序

### 添加文档

将 `.md` 文件放入 `public/docs/` 目录（支持子目录），重启 dev server 或重新 build 即可自动索引。文件首行 `# 标题` 会作为文档标题，无标题则用文件名。

## 页面布局

```
┌──────────────────────────────────────────┐
│  Header: "知识库"                          │
├─────────────┬────────────────────────────┤
│  SearchBar   │                            │
│─────────────│                            │
│  DocTree     │    MarkdownViewer          │
│  (目录树)     │    (文档内容渲染)            │
│             │                            │
│             │                            │
└─────────────┴────────────────────────────┘
```

三栏布局（Header + Sider + Content），使用 Ant Design 组件库。

## 核心实现流程

### 1. 构建时：Vite 插件索引文档 (`vite-plugin-docs.ts`)

这是整个搜索的关键前置步骤，在 `vite build` 或 `vite dev` 启动时执行：

1. **扫描 `public/docs/` 目录**，递归找到所有 `.md` 文件
2. **构建目录树** → 输出 `public/docs-tree.json`（供左侧 DocTree 组件使用）
3. **中文分词** → 使用 `@node-rs/jieba`（结巴分词的 Rust 实现）对每个文档内容调用 `jieba.cutForSearch(content)` 进行分词
4. **输出搜索索引** → `public/search-index.json`，每个文档保存为：
   ```json
   { "relativePath": "foo/bar.md", "title": "文档标题", "tokens": ["分词", "结果", ...] }
   ```

### 2. 运行时：前端加载索引 (`App.tsx`)

页面挂载时同时拉取两个 JSON：
```ts
Promise.all([
  fetch('/docs-tree.json'),   // 目录树
  fetch('/search-index.json') // 搜索索引（含分词结果）
])
```
然后将文档索引进 `BM25Search` 实例。

## Search 的具体实现（重点）

搜索分为**构建时索引**和**运行时查询**两部分：

### 构建时：分词 + 建索引

在 `vite-plugin-docs.ts:89`：
```ts
const tokens = jieba.cutForSearch(content);
```
使用 **jieba 分词器**的搜索模式，将中文文档拆成词语列表。例如 `"知识库系统"` 可能被分为 `["知识", "知识库", "库系", "系统"]`。这个分词在 **Node.js 端（构建时）** 完成，前端直接拿到分好的 tokens。

### 运行时：BM25 搜索算法 (`src/utils/search.ts`)

前端实现了一个完整的 **BM25 排序算法**，这是信息检索领域的经典算法。

**初始化阶段** (`init` 方法)：
- `tf`：记录每个文档中每个 token 出现的次数（词频）
- `df`：记录每个 token 在多少个文档中出现过（文档频率）
- `docLen`：每个文档的 token 总数
- `avgLen`：所有文档的平均 token 数

**查询阶段** (`search` 方法)：
1. **查询分词** (`tokenizeQuery`)：浏览器端轻量分词
   - 英文：按空格/标点分割，转小写
   - 中文：逐字 + 相邻双字组合（bigram），例如 `"搜索"` → `["搜", "搜索", "索"]`
2. **BM25 评分**：对每个文档计算相关性分数：
   ```
   score = Σ( IDF(token) × TF_norm(token) )
   ```
   其中：
   - **IDF** = `log((N - df + 0.5) / (df + 0.5) + 1)` — 越稀有的词权重越高
   - **TF_norm** = `(tf × (k1+1)) / (tf + k1 × (1 - b + b × dl/avgLen))` — 词频归一化，考虑文档长度
   - 参数：`k1=1.5`（词频饱和度），`b=0.75`（长度归一化）
3. **排序返回** top-K 结果

### 3. UI 交互 (`SearchBar.tsx`)

- 用户输入时实时触发搜索（`onChange` → `onSearch`）
- 搜索结果以列表展示，点击结果项加载对应 Markdown 文档

### 模块总结

| 模块 | 技术 | 作用 |
|------|------|------|
| `vite-plugin-docs.ts` | jieba 分词 | 构建时对文档分词，生成索引 JSON |
| `src/utils/search.ts` | 手写 BM25 | 运行时对查询分词 + BM25 相关性排序 |
| `SearchBar.tsx` | Ant Design Input | 搜索输入 + 结果展示 |
| `DocTree.tsx` | Ant Design Tree | 文件目录树导航 |
| `MarkdownViewer.tsx` | markdown-it + highlight.js | 渲染 Markdown 并高亮代码 |

核心思路：**构建时分词建索引，运行时 BM25 算法排序**，实现了一个纯前端、无需后端服务的中文文档全文搜索。

## 编码规范

- 函数/变量使用 camelCase，组件使用 PascalCase
- React 函数组件使用 `React.FC` 类型
- 样式使用内联 style 对象，无 CSS Modules
- 中文注释和 UI 文案
