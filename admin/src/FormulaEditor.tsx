import React, { useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  rows?: number;
}

export const renderLatexToString = (latex: string, displayMode: boolean = true): string => {
  if (!latex || !latex.trim()) return '';
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode
    });
  } catch (err) {
    return `<span style="color: red;">Invalid LaTeX</span>`;
  }
};

export const MathRenderer: React.FC<{ text: string; inline?: boolean }> = ({ text, inline = false }) => {
  if (!text) return null;

  // Function to render text content that might contain HTML formatting tags (ul, li, br, b, i, u, h1-h6) or raw newlines
  const renderFormattedText = (textContent: string, keyPrefix: string | number) => {
    if (!textContent) return null;

    // Check if text has HTML tags like <ul>, <li>, <br>, <b>, <i>, <u>, <h3>, etc.
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(textContent);

    if (hasHtmlTags) {
      return <span key={keyPrefix} dangerouslySetInnerHTML={{ __html: textContent }} />;
    }

    // Handle plain newlines if no HTML tags are present
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

  // Check if text contains LaTeX delimiters or math expressions
  const hasLatexDelimiters = /\\\(|\\\[|\$|\{|\^|_|\\frac|\\sqrt|\\times|\\pm|\\div|\\sum|\\int|\\pi|\\alpha|\\beta|\\theta/.test(text);

  if (!hasLatexDelimiters) {
    return renderFormattedText(text, 'single');
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
    const html = renderLatexToString(text, !inline);
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

export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type LaTeX formula, e.g. R_T = \\frac{R_1 \\times R_2}{R_1 + R_2}',
  rows = 2
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (snippet: string, cursorOffset: number = 0) => {
    if (!textareaRef.current) {
      onChange(value + snippet);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + snippet + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + snippet.length + cursorOffset;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const toolbarItems = [
    { label: 'Fraction', symbol: '\\frac{a}{b}', snippet: '\\frac{a}{b}', offset: -4 },
    { label: 'Sqrt', symbol: '\\sqrt{x}', snippet: '\\sqrt{x}', offset: -2 },
    { label: 'Subscript', symbol: 'X_{1}', snippet: '_{1}', offset: 0 },
    { label: 'Power', symbol: 'X^{2}', snippet: '^{2}', offset: 0 },
    { label: 'Times', symbol: '\\times', snippet: ' \\times ', offset: 0 },
    { label: 'Div', symbol: '\\div', snippet: ' \\div ', offset: 0 },
    { label: 'PlusMinus', symbol: '\\pm', snippet: ' \\pm ', offset: 0 },
    { label: 'Sum', symbol: '\\sum_{i=1}^{n}', snippet: '\\sum_{i=1}^{n}', offset: 0 },
    { label: 'Integral', symbol: '\\int_{a}^{b}', snippet: '\\int_{a}^{b}', offset: 0 },
    { label: 'Pi', symbol: '\\pi', snippet: '\\pi', offset: 0 },
    { label: 'Alpha', symbol: '\\alpha', snippet: '\\alpha', offset: 0 },
    { label: 'Beta', symbol: '\\beta', snippet: '\\beta', offset: 0 },
    { label: 'Theta', symbol: '\\theta', snippet: '\\theta', offset: 0 },
    {
      label: 'Parallel Resistance Preset',
      symbol: 'R_T = \\frac{R_1 \\times R_2}{R_1 + R_2}',
      snippet: 'R_T = \\frac{R_1 \\times R_2}{R_1 + R_2}',
      offset: 0
    }
  ];

  const renderedHtml = renderLatexToString(value, true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Quick Insert Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '6px 8px',
        backgroundColor: 'var(--primary-light)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px'
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
          Math Toolbar:
        </span>
        {toolbarItems.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-secondary"
            onClick={() => insertSnippet(item.snippet, item.offset)}
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title={item.label}
          >
            {item.label === 'Parallel Resistance Preset' ? 'Parallel R Preset' : item.label}
          </button>
        ))}
      </div>

      {/* Inputs + Live Rendered Preview Side-by-Side Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>LaTeX Input</span>
          <textarea
            ref={textareaRef}
            className="form-input"
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              resize: 'vertical',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Live Rendered KaTeX Preview</span>
          <div
            style={{
              padding: '8px 12px',
              minHeight: '60px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflowX: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml || '<span style="color: var(--text-muted); font-size: 0.8rem; italic;">LaTeX preview will render here</span>' }}
          />
        </div>
      </div>
    </div>
  );
};

export default FormulaEditor;
