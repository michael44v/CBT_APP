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

export const formatQuestionWithFormula = (questionText: string, formula?: string): string => {
  if (!formula || !formula.trim()) return questionText || '';
  const qText = questionText || '';
  const trimmedFormula = formula.trim();
  const hasDelimiter = /^(\\\(|\\\[|\$|\$\$)/.test(trimmedFormula);
  const formattedFormula = hasDelimiter
    ? trimmedFormula
    : trimmedFormula.includes('\n') || trimmedFormula.includes('\\\\') || trimmedFormula.includes('\\begin')
    ? `\\[ ${trimmedFormula} \\]`
    : `\\( ${trimmedFormula} \\)`;
  return qText ? `${qText} ${formattedFormula}` : formattedFormula;
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

  const renderFormattedText = (textContent: string, keyPrefix: string | number) => {
    if (!textContent) return null;

    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(textContent);
    if (hasHtmlTags) {
      const normalized = normalizeHtmlImageUrls(textContent);
      return <span key={keyPrefix} dangerouslySetInnerHTML={{ __html: normalized }} />;
    }

    if (textContent.includes('\n')) {
      const lines = textContent.split('\n');
      return (
        <span key={keyPrefix}>
          {lines.map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    }

    return <span key={keyPrefix}>{textContent}</span>;
  };

  // Check if text contains LaTeX delimiters \(...\), \[...\], or $...$ or raw latex math commands
  const hasLatexConstructs = /\\\(|\\\[|\$|\{|\^|_|\\frac|\\sqrt|\\times|\\div|\\pm|\\sum|\\int|\\pi|\\alpha|\\beta|\\theta|\\begin|\\end/.test(text);

  if (!hasLatexConstructs) {
    return renderFormattedText(text, 'single');
  }

  // Auto-detect raw LaTeX math commands without explicit delimiters and wrap them
  let processedText = text;
  const hasExplicitDelimiters = /(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))|(\$\$[\s\S]*?\$\$)|(\$[^\$]+?\$)/.test(text);

  if (!hasExplicitDelimiters && /\\(?:frac|sqrt|times|div|pm|sum|int|pi|alpha|beta|theta|begin|end)\b/.test(text)) {
    // Wrap raw LaTeX command expressions in \(...\)
    processedText = processedText.replace(/(\\(?:frac|sqrt|sum|int)\{[^}]+\}(?:\{[^}]+\})*|\\(?:times|div|pm|pi|alpha|beta|theta))/g, '\\($1\\)');
  }

  // Parse text into plain text segments and LaTeX segments
  const segments: { type: 'text' | 'latex'; content: string; displayMode?: boolean }[] = [];
  const regex = /(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))|(\$\$[\s\S]*?\$\$)|(\$[^\$]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(processedText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: processedText.substring(lastIndex, match.index) });
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

  if (lastIndex < processedText.length) {
    segments.push({ type: 'text', content: processedText.substring(lastIndex) });
  }

  if (segments.length === 0) {
    // If no delimiters found but contains raw LaTeX formula
    const html = renderLatexToString(processedText, !inline);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return renderFormattedText(seg.content, i);
        } else {
          const html = renderLatexToString(seg.content, seg.displayMode ?? !inline);
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
      })}
    </span>
  );
};

export default MathRenderer;
