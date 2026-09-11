import React, { useRef } from 'react';
import { Bold, Italic, Underline, List, CornerDownLeft, Heading } from 'lucide-react';
import { MathRenderer } from './FormulaEditor';

interface RichTextEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  rows?: number;
  showMathToolbar?: boolean;
  showPreview?: boolean;
  previewTitle?: string;
}

/**
 * Sanitizes and normalizes HTML formatting strings to guarantee valid tag nesting.
 * Ensures block elements (<h3>, <ul>, <ol>, <li>) are never nested inside inline elements (<b>, <i>, <u>, <span>).
 */
export const sanitizeHtmlFormatting = (html: string): string => {
  if (!html) return html;

  let cleaned = html;

  // Fix improper nesting where inline elements wrap block elements, e.g. <b><u><h3>text</h3></u></b> or <b><ul><li>text</li></ul></b>
  const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'p', 'div'];
  const inlineTags = ['b', 'i', 'u', 'strong', 'em', 'span'];

  inlineTags.forEach(inline => {
    blockTags.forEach(block => {
      // Pattern matching <inline><block>content</block></inline> -> <block><inline>content</inline></block>
      const regex = new RegExp(`<${inline}>\\s*<${block}>([\\s\\S]*?)</${block}>\\s*</${inline}>`, 'gi');
      cleaned = cleaned.replace(regex, `<${block}><${inline}>$1</${inline}></${block}>`);
    });
  });

  // Clean empty inline tags or invalid lone breaks inside headings/lists
  cleaned = cleaned.replace(/<(b|i|u|strong|em)>\s*<\/(b|i|u|strong|em)>/gi, '');

  return cleaned;
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type text or formatted content here...',
  rows = 13,
  showMathToolbar = false,
  showPreview = false,
  previewTitle = 'Live Preview'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyInlineFormatting = (tag: 'b' | 'i' | 'u', defaultText: string) => {
    if (!textareaRef.current) {
      const sanitized = sanitizeHtmlFormatting(value + `<${tag}>${defaultText}</${tag}>`);
      onChange(sanitized);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;

    const selectedText = value.substring(start, end);

    let replacement = '';
    let newCursorStart = start;
    let newCursorEnd = end;

    if (selectedText) {
      // Check if the selected text is already wrapped in this inline tag (Toggle off)
      if (selectedText.startsWith(openTag) && selectedText.endsWith(closeTag)) {
        replacement = selectedText.substring(openTag.length, selectedText.length - closeTag.length);
        newCursorEnd = start + replacement.length;
      } else {
        // Wrap ONLY the selected inline text content
        replacement = `${openTag}${selectedText}${closeTag}`;
        newCursorStart = start + openTag.length;
        newCursorEnd = newCursorStart + selectedText.length;
      }
    } else {
      // Insert empty tag with default text at current cursor position
      replacement = `${openTag}${defaultText}${closeTag}`;
      newCursorStart = start + openTag.length;
      newCursorEnd = newCursorStart + defaultText.length;
    }

    const uncleanedNewValue = value.substring(0, start) + replacement + value.substring(end);
    const sanitizedValue = sanitizeHtmlFormatting(uncleanedNewValue);
    onChange(sanitizedValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  const applyBlockFormatting = (type: 'heading' | 'list' | 'break') => {
    if (!textareaRef.current) {
      let snippet = '';
      if (type === 'heading') snippet = '<h3>Heading</h3>';
      else if (type === 'list') snippet = '<ul>\n  <li>List Item</li>\n</ul>';
      else if (type === 'break') snippet = '<br/>\n';

      onChange(sanitizeHtmlFormatting(value + snippet));
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let replacement = '';
    if (type === 'heading') {
      const content = selectedText || 'Heading';
      replacement = `<h3>${content}</h3>`;
    } else if (type === 'list') {
      const content = selectedText || 'List Item';
      replacement = `<ul>\n  <li>${content}</li>\n</ul>`;
    } else if (type === 'break') {
      replacement = '<br/>\n';
    }

    const uncleanedNewValue = value.substring(0, start) + replacement + value.substring(end);
    const sanitizedValue = sanitizeHtmlFormatting(uncleanedNewValue);
    onChange(sanitizedValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + replacement.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const insertSnippet = (snippet: string) => {
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
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const mathItems = [
    { label: 'Fraction', snippet: '\\( \\frac{a}{b} \\)' },
    { label: 'Sqrt', snippet: '\\( \\sqrt{x} \\)' },
    { label: 'Subscript', snippet: '\\( X_{1} \\)' },
    { label: 'Power', snippet: '\\( X^{2} \\)' },
    { label: 'Times', snippet: '\\( \\times \\)' },
    { label: 'Div', snippet: '\\( \\div \\)' },
    { label: 'PlusMinus', snippet: '\\( \\pm \\)' },
    { label: 'Sum', snippet: '\\( \\sum_{i=1}^{n} \\)' },
    { label: 'Integral', snippet: '\\( \\int_{a}^{b} \\)' },
    { label: 'Pi', snippet: '\\( \\pi \\)' },
    { label: 'Alpha', snippet: '\\( \\alpha \\)' },
    { label: 'Beta', snippet: '\\( \\beta \\)' },
    { label: 'Theta', snippet: '\\( \\theta \\)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '6px 8px',
          backgroundColor: 'var(--primary-light)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          alignItems: 'center'
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
          Format:
        </span>

        {/* Text Formatting Toolbar */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyInlineFormatting('b', 'bold text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Bold"
        >
          <Bold size={13} /> Bold
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyInlineFormatting('i', 'italic text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Italic"
        >
          <Italic size={13} /> Italic
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyInlineFormatting('u', 'underlined text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Underline"
        >
          <Underline size={13} /> Underline
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyBlockFormatting('heading')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Heading"
        >
          <Heading size={13} /> Heading
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyBlockFormatting('break')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Line Break"
        >
          <CornerDownLeft size={13} /> Line Break
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => applyBlockFormatting('list')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Bullet List"
        >
          <List size={13} /> List
        </button>

        {/* Optional Math Formula Snippet Toolbar */}
        {showMathToolbar && (
          <>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px', marginRight: '2px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
              Math:
            </span>
            {mathItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-secondary"
                onClick={() => insertSnippet(item.snippet)}
                style={{ padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 }}
                title={`Insert ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editor & Optional Preview */}
      <div style={{ display: showPreview ? 'grid' : 'block', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
         <textarea
  ref={textareaRef}
  className="form-input"
  rows={rows}
  placeholder={placeholder}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  style={{
    fontFamily: 'inherit',
    fontSize: '0.88rem',
    resize: 'vertical',
    width: '100%',
    minHeight: rows > 5 ? '200px' : '100px'
  }}

          />
        </div>

        {showPreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{previewTitle}</span>
            <div
              style={{
                padding: '8px 12px',
                minHeight: '70px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                color: 'var(--text-main)'
              }}
            >
              {value ? <MathRenderer text={value} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', italic: true }}>Formatted text preview will render here...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;
