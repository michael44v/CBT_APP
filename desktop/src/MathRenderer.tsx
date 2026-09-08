import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
