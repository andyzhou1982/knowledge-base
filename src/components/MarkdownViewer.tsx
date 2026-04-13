import React, { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'github-markdown-css/github-markdown-light.css';
import 'highlight.js/styles/github.css';

interface MarkdownViewerProps {
  content: string;
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

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [content]);

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
