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
    MarkdownViewer.tsx       # markdown-it 渲染 + highlight.js 代码高亮 + 搜索关键词高亮与定位
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

1. **构建时索引**（`vite-plugin-docs.ts`）：Vite 启动时扫描 `public/docs/`，用 jieba 分词 + 相邻 CJK token 拼接生成短语 token，输出 `docs-tree.json` 和 `search-index.json`
2. **运行时查询**（`src/utils/search.ts`）：前端加载索引 JSON，构建 token 词典，对查询做正向最大匹配分词（区分空格语义），然后用 BM25 算法计算相关性评分并排序

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

### 构建时：分词 + 短语 token + 建索引

在 `vite-plugin-docs.ts` 中，分两步生成索引 tokens：

**第一步：jieba 分词 + 大小写归一化**
```ts
const tokens = jieba.cutForSearch(content).map(t => /[\u4e00-\u9fff]/.test(t) ? t : t.toLowerCase());
```
使用 **jieba 分词器**的搜索模式，将中文文档拆成词语列表。例如 `"类型守卫"` 会被分为 `["类型", "守卫"]`。非 CJK token 统一转小写，确保与查询端大小写一致（jieba 保留英文原始大小写如 `"Compose"`，查询端会转 `toLowerCase()`，需对齐）。

**第二步：生成短语 token**（`generatePhraseTokens`）
对连续的 CJK token 做相邻拼接（bigram），将拼接结果作为额外的短语 token 加入索引。例如 jieba 输出 `["类型", "守卫"]`，则额外添加 `"类型守卫"`。这样构建时的 tokens 包含了短语级别的匹配单元。

最终索引中每个文档保存为：
```json
{ "relativePath": "foo.md", "title": "标题", "tokens": ["类型", "守卫", "类型守卫", ...] }
```

### 运行时：BM25 搜索算法 (`src/utils/search.ts`)

前端实现了一个完整的 **BM25 排序算法**，这是信息检索领域的经典算法。

**初始化阶段** (`init` 方法)：
- `tokenDict`：从所有文档 token 构建 `Set<string>` 词典，供查询分词使用
- `tf`：记录每个文档中每个 token 出现的次数（词频）
- `df`：记录每个 token 在多少个文档中出现过（文档频率）
- `docLen`：每个文档的 token 总数
- `avgLen`：所有文档的平均 token 数

**查询阶段** (`search` 方法)：
1. **查询分词** (`tokenizeQuery`)：区分空格语义，用 token 词典做正向最大匹配
   - 无空格 `"类型守卫"` → 整体优先匹配词典，匹配到则作为单个 token → `["类型守卫"]`（短语搜索）
   - 有空格 `"类型 守卫"` → 各部分独立最大匹配 → `["类型", "守卫"]`（词组搜索）
   - 英文：按空格/标点分割，转小写
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
- 搜索结果以列表展示，点击结果项加载对应 Markdown 文档，并将搜索词传递给 MarkdownViewer 进行高亮

### 4. 搜索结果高亮与定位 (`MarkdownViewer.tsx`)

点击搜索结果后，MarkdownViewer 接收 `highlightTerms` prop，执行以下流程：

1. **高亮**：用 `TreeWalker` 遍历 DOM 文本节点，对 `toLowerCase()` 做大小写不敏感匹配，截取时保留原文大小写，将匹配词包裹在 `<mark class="search-highlight">` 标签中
2. **定位**：匹配完成后调用 `scrollIntoView({ block: 'center' })` 滚动到第一个匹配位置
3. **目录树点击**：不传 `highlightTerms`，页面回到顶部，不高亮

高亮样式定义在 `App.css`：
- `.search-highlight`：淡黄底 `#fff3cd`

### 模块总结

| 模块 | 技术 | 作用 |
|------|------|------|
| `vite-plugin-docs.ts` | jieba 分词 + 短语拼接 | 构建时对文档分词，生成含短语 token 的索引 JSON |
| `src/utils/search.ts` | 正向最大匹配 + BM25 | 运行时对查询分词（区分空格语义）+ BM25 相关性排序 |
| `SearchBar.tsx` | Ant Design Input | 搜索输入 + 结果展示 |
| `DocTree.tsx` | Ant Design Tree | 文件目录树导航 |
| `MarkdownViewer.tsx` | markdown-it + highlight.js + TreeWalker | 渲染 Markdown、代码高亮、搜索关键词高亮与定位 |

核心思路：**构建时 jieba 分词 + 短语 token 拼接，运行时正向最大匹配 + BM25 排序，搜索结果点击后关键词高亮定位**。通过空格区分短语搜索与词组搜索，构建时和运行时分词保持一致，实现精准的中文文档全文搜索。

## 编码规范

- 函数/变量使用 camelCase，组件使用 PascalCase
- React 函数组件使用 `React.FC` 类型
- 样式使用内联 style 对象，无 CSS Modules
- 中文注释和 UI 文案
