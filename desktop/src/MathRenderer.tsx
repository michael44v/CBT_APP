import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const resolveImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `https://cbt.filloptech.com/${trimmed.replace(/^\/+/, '')}`;
};

export const normalizeHtmlImageUrls = (htmlStr: string): string => {
  if (!htmlStr) return '';
  return htmlStr.replace(/<img\s+([^>]*?)src=['"]([^'"]+)['"]([^>]*?)\/?>/gi, (match, p1, src, p2) => {
    const fullUrl = resolveImageUrl(src);
    return `<img ${p1}src="${fullUrl}"${p2}/>`;
  });
};

export const renderLatexToString = (latex: string, displayMode: boolean = true): string => {
  if (!latex || !latex.trim()) return '';
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode
    });
  } catch (err) {
    return `<span>${latex}</span>`;
  }
};

export const MathRenderer: React.FC<{ text: string; inline?: boolean }> = ({ text, inline = false }) => {
  if (!text) return null;

  // Check if text contains LaTeX delimiters \(...\), \[...\], or $...$ or latex math constructs
  const hasLatexDelimiters = /\\\(|\\\[|\$|\{|\^|_|\\frac|\\sqrt|\\times|\\pm|\\div/.test(text);

  if (!hasLatexDelimiters) {
    if (/<[a-z][\s\S]*>/i.test(text)) {
      const normalized = normalizeHtmlImageUrls(text);
      return <span dangerouslySetInnerHTML={{ __html: normalized }} />;
    }
    return <span>{text}</span>;
  }

  // Parse text into plain text segments and LaTeX segments
  const segments: { type: 'text' | 'latex'; content: string; displayMode?: boolean }[] = [];
  const regex = /(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))|(\$\$[\s\S]*?\$\$)|(\$[^\$]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    const matchedStr = match[0];
    if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      segments.push({ type: 'latex', content: matchedStr.slice(2, -2), displayMode: true });
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      segments.push({ type: 'latex', content: matchedStr.slice(2, -2), displayMode: false });
    } else if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      segments.push({ type: 'latex', content: matchedStr.slice(2, -2), displayMode: true });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      segments.push({ type: 'latex', content: matchedStr.slice(1, -1), displayMode: false });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }

  if (segments.length === 0) {
    // If no delimiters found but contains raw LaTeX formula
    const html = renderLatexToString(text, !inline);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          if (/<[a-z][\s\S]*>/i.test(seg.content)) {
            const normalized = normalizeHtmlImageUrls(seg.content);
            return <span key={i} dangerouslySetInnerHTML={{ __html: normalized }} />;
          }
          return <span key={i}>{seg.content}</span>;
        } else {
          const html = renderLatexToString(seg.content, seg.displayMode ?? !inline);
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
      })}
    </span>
  );
};

export default MathRenderer;
