interface DocIndex {
  relativePath: string;
  title: string;
  tokens: string[];
}

interface SearchResult {
  relativePath: string;
  title: string;
  score: number;
}

const CJK_REGEX = /[\u4e00-\u9fff]/;
const CJK_SEGMENT_REGEX = /[\u4e00-\u9fff]+/g;

/** 正向最大匹配：用词典对 CJK 片段做分词 */
function maxMatch(segment: string, dict: Set<string>): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < segment.length) {
    let matched = false;
    // 从最长开始尝试匹配，最多 6 个字符
    for (let len = Math.min(6, segment.length - i); len > 1; len--) {
      const sub = segment.substring(i, i + len);
      if (dict.has(sub)) {
        tokens.push(sub);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(segment[i]);
      i++;
    }
  }
  return tokens;
}

/**
 * 查询分词：区分空格语义
 * - 有空格 "类型 守卫" → 各部分独立最大匹配（词组搜索）
 * - 无空格 "类型守卫" → 先尝试整体匹配，再正向最大匹配（短语搜索）
 * - 英文部分 → 直接 lowercase
 */
function tokenizeQuery(query: string, tokenDict: Set<string>): string[] {
  const tokens: string[] = [];

  // 按标点分割（空格作为语义分隔符单独处理）
  const parts = query.split(/[,，。！？、；：""''【】《》（）\(\)\[\]\{\}\|\\\/\~`@#\$%\^&\*\-=_\+]+/);

  for (const part of parts) {
    if (!part) continue;

    // 按空格拆分，判断是短语还是词组
    const segments = part.trim().split(/\s+/);

    for (const seg of segments) {
      if (!seg) continue;

      if (CJK_REGEX.test(seg)) {
        // 提取 CJK 连续片段
        const cjkParts = seg.match(CJK_SEGMENT_REGEX) || [];
        for (const cjk of cjkParts) {
          // 先尝试整体在词典中
          if (tokenDict.has(cjk)) {
            tokens.push(cjk);
          } else {
            // 正向最大匹配
            tokens.push(...maxMatch(cjk, tokenDict));
          }
        }
        // 提取非 CJK 部分（如英文）
        const nonCjk = seg.replace(CJK_SEGMENT_REGEX, ' ').trim();
        if (nonCjk) {
          for (const w of nonCjk.split(/\s+/)) {
            if (w) tokens.push(w.toLowerCase());
          }
        }
      } else {
        tokens.push(seg.toLowerCase());
      }
    }
  }

  return tokens;
}

class BM25Search {
  private k1 = 1.5;
  private b = 0.75;
  private docs: DocIndex[] = [];
  private df: Map<string, number> = new Map();
  private tf: Map<string, Map<string, number>> = new Map();
  private docLen: number[] = [];
  private avgLen = 0;
  private N = 0;
  private tokenDict: Set<string> = new Set();

  init(docs: DocIndex[]) {
    this.docs = docs;
    this.N = docs.length;
    this.df.clear();
    this.tf.clear();
    this.docLen = [];
    this.tokenDict.clear();

    let totalLen = 0;

    for (let i = 0; i < docs.length; i++) {
      const tokens = docs[i].tokens;
      this.docLen.push(tokens.length);
      totalLen += tokens.length;

      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
        this.tokenDict.add(token);
      }
      this.tf.set(docs[i].relativePath, tfMap);

      for (const token of tfMap.keys()) {
        this.df.set(token, (this.df.get(token) || 0) + 1);
      }
    }

    this.avgLen = this.N > 0 ? totalLen / this.N : 0;
  }

  search(query: string, topK = 20): SearchResult[] {
    const queryTokens = tokenizeQuery(query, this.tokenDict);
    if (queryTokens.length === 0) return [];

    const scores: SearchResult[] = [];

    for (let i = 0; i < this.docs.length; i++) {
      const doc = this.docs[i];
      const tfMap = this.tf.get(doc.relativePath)!;
      const dl = this.docLen[i];
      let score = 0;

      for (const token of queryTokens) {
        const tf = tfMap.get(token) || 0;
        if (tf === 0) continue;

        const df = this.df.get(token) || 0;
        const idf = Math.log((this.N - df + 0.5) / (df + 0.5) + 1);
        const tfNorm = (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * (dl / this.avgLen)));
        score += idf * tfNorm;
      }

      if (score > 0) {
        scores.push({ relativePath: doc.relativePath, title: doc.title, score });
      }
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

export type { DocIndex, SearchResult };
export { BM25Search };
