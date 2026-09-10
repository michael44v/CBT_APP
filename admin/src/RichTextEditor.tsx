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

  const insertFormatting = (before: string, after: string = '', defaultText: string = '') => {
    if (!textareaRef.current) {
      onChange(value + before + defaultText + after);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const replacement = before + selectedText + after;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selectedText.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
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
          onClick={() => insertFormatting('<b>', '</b>', 'bold text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Bold"
        >
          <Bold size={13} /> Bold
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => insertFormatting('<i>', '</i>', 'italic text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Italic"
        >
          <Italic size={13} /> Italic
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Underline"
        >
          <Underline size={13} /> Underline
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => insertFormatting('<h3>', '</h3>', 'Heading')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Heading"
        >
          <Heading size={13} /> Heading
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => insertFormatting('<br/>\n', '', '')}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Line Break"
        >
          <CornerDownLeft size={13} /> Line Break
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>', 'List Item')}
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
                onClick={() => insertFormatting(item.snippet, '', '')}
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
    minHeight: '350px'
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
