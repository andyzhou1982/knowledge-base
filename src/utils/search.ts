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

/** 简单的浏览器端分词：按空格/标点分割 + 中文字符 bigram */
function tokenizeQuery(query: string): string[] {
  const tokens: string[] = [];

  // Extract CJK character sequences and non-CJK words
  const parts = query.split(/[\s,，。！？、；：""''【】《》（）\(\)\[\]\{\}\|\\\/\~`@#\$%\^&\*\-=_\+]+/);

  for (const part of parts) {
    if (!part) continue;
    // Check if it contains CJK characters
    if (/[\u4e00-\u9fff]/.test(part)) {
      // Split into individual Chinese characters and bigrams
      const chars = part.match(/[\u4e00-\u9fff]+/g) || [];
      for (const segment of chars) {
        for (let i = 0; i < segment.length; i++) {
          tokens.push(segment[i]);
          if (i + 1 < segment.length) {
            tokens.push(segment.substring(i, i + 2));
          }
        }
      }
    } else {
      tokens.push(part.toLowerCase());
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

  init(docs: DocIndex[]) {
    this.docs = docs;
    this.N = docs.length;
    this.df.clear();
    this.tf.clear();
    this.docLen = [];

    let totalLen = 0;

    for (let i = 0; i < docs.length; i++) {
      const tokens = docs[i].tokens;
      this.docLen.push(tokens.length);
      totalLen += tokens.length;

      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }
      this.tf.set(docs[i].relativePath, tfMap);

      for (const token of tfMap.keys()) {
        this.df.set(token, (this.df.get(token) || 0) + 1);
      }
    }

    this.avgLen = this.N > 0 ? totalLen / this.N : 0;
  }

  search(query: string, topK = 20): SearchResult[] {
    const queryTokens = tokenizeQuery(query);
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
