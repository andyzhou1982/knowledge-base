import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict';

interface DocEntry {
  relativePath: string;
  title: string;
  content: string;
  tokens: string[];
}

interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

function scanDocsDir(docsRoot: string, base: string = ''): string[] {
  const entries = fs.readdirSync(docsRoot, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(docsRoot, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...scanDocsDir(fullPath, relPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(relPath);
    }
  }
  return files;
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const key = parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.title === part);
      if (!node) {
        node = { title: part, key, isLeaf, children: isLeaf ? undefined : [] };
        current.push(node);
      }
      if (node.children) {
        current = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(root);

  return root;
}

/** 判断 token 是否为纯 CJK 字符 */
function isCJKToken(token: string): boolean {
  return /^[\u4e00-\u9fff]+$/.test(token);
}

/** 对连续的 CJK token 做相邻拼接（bigram），生成短语 token */
function generatePhraseTokens(tokens: string[]): string[] {
  const phrases: string[] = [];
  // 提取连续 CJK token 的区间
  const cjkRanges: { start: number; end: number }[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (isCJKToken(tokens[i])) {
      const start = i;
      while (i < tokens.length && isCJKToken(tokens[i])) i++;
      cjkRanges.push({ start, end: i });
    } else {
      i++;
    }
  }
  // 对每个连续区间生成相邻 token 拼接
  for (const range of cjkRanges) {
    for (let j = range.start; j < range.end - 1; j++) {
      const phrase = tokens[j] + tokens[j + 1];
      if (phrase.length >= 3) {
        phrases.push(phrase);
      }
    }
  }
  return [...new Set(phrases)];
}

export function docsPlugin(): Plugin {
  const docsDir = path.resolve(__dirname, 'public/docs');

  return {
    name: 'vite-plugin-docs',
    buildStart() {
      if (!fs.existsSync(docsDir)) return;

      const jieba = Jieba.withDict(dict);
      const files = scanDocsDir(docsDir);
      const tree = buildTree(files);

      const docs: DocEntry[] = files.map((relPath) => {
        const fullPath = path.join(docsDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const title = content.match(/^#\s+(.+)$/m)?.[1] || path.basename(relPath, '.md');
        const tokens = jieba.cutForSearch(content);
        // 对连续 CJK token 做相邻拼接，生成短语 token
        const phraseTokens = generatePhraseTokens(tokens);
        return { relativePath: relPath, title, content, tokens: [...tokens, ...phraseTokens] };
      });

      const outputDir = path.resolve(__dirname, 'public');
      fs.writeFileSync(path.join(outputDir, 'docs-tree.json'), JSON.stringify(tree, null, 2));
      fs.writeFileSync(
        path.join(outputDir, 'search-index.json'),
        JSON.stringify(
          docs.map((d) => ({ relativePath: d.relativePath, title: d.title, tokens: d.tokens })),
          null,
          2
        )
      );

      console.log(`[docs-plugin] Indexed ${docs.length} documents`);
    },
  };
}
