import React, { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'github-markdown-css/github-markdown-light.css';
import 'highlight.js/styles/github.css';

interface MarkdownViewerProps {
  content: string;
  highlightTerms?: string[];
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {
        // fall through
      }
    }
    return hljs.highlightAuto(str).value;
  },
});

/** 在 DOM 中高亮指定关键词，并滚动到第一个匹配位置 */
function highlightAndScroll(container: HTMLElement, terms: string[]) {
  if (!terms.length) return;

  // 按长度降序排列，优先匹配较长的词
  const sorted = [...terms].sort((a, b) => b.length - a.length);

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const text = node.textContent || '';
    // 找到所有匹配位置
    const matches: { start: number; end: number }[] = [];
    for (const term of sorted) {
      let pos = 0;
      while (true) {
        const idx = text.indexOf(term, pos);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + term.length });
        pos = idx + 1;
      }
    }

    if (!matches.length) continue;

    // 按位置排序并去重
    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    const parent = node.parentNode!;
    const fragment = document.createDocumentFragment();
    let lastIdx = 0;

    for (const m of matches) {
      if (m.start < lastIdx) continue; // 跳过重叠
      if (m.start > lastIdx) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx, m.start)));
      }
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.substring(m.start, m.end);
      fragment.appendChild(mark);
      lastIdx = m.end;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
    }

    parent.replaceChild(fragment, node);
  }

  // 滚动到第一个高亮
  const first = container.querySelector('.search-highlight');
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, highlightTerms }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!highlightTerms || highlightTerms.length === 0) {
      containerRef.current.scrollTop = 0;
      return;
    }
    // 等待 DOM 更新后高亮
    requestAnimationFrame(() => {
      if (containerRef.current) {
        highlightAndScroll(containerRef.current, highlightTerms);
      }
    });
  }, [content, highlightTerms]);

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      style={{ padding: '24px 40px', overflowY: 'auto', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: md.render(content) }}
    />
  );
};

export default MarkdownViewer;
