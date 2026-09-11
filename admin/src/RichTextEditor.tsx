import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef<boolean>(false);

  // Active formatting state for toolbar buttons
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    heading: false,
    list: false,
  });

  // Track if content is empty to show placeholder
  const [isEmpty, setIsEmpty] = useState<boolean>(!value || value.trim() === '');

  // Synchronize incoming `value` prop to contentEditable innerHTML without losing cursor
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const normalizedProp = value || '';

    // Only update innerHTML if the external prop differs significantly from current innerHTML
    if (normalizedProp !== currentHtml && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = normalizedProp;
      const text = editorRef.current.innerText || '';
      setIsEmpty(text.trim() === '' && !editorRef.current.querySelector('img, ul, ol, h3'));
    }
  }, [value]);

  // Check state of selection/cursor to update active formatting toolbar buttons
  const checkSelectionState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isList = document.queryCommandState('insertUnorderedList');

      let isHeading = false;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let parent: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (parent && parent !== editorRef.current) {
          if (parent.nodeName === 'H3' || parent.nodeName === 'H1' || parent.nodeName === 'H2') {
            isHeading = true;
            break;
          }
          parent = parent.parentNode;
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        heading: isHeading,
        list: isList,
      });
    } catch (e) {
      // Ignore queryCommandState errors if document not focused
    }
  }, []);

  const handleInput = () => {
    if (!editorRef.current || isComposingRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const textContent = editorRef.current.innerText || '';

    const empty = textContent.trim() === '' && !editorRef.current.querySelector('img, ul, ol, h3, br');
    setIsEmpty(empty);

    onChange(empty ? '' : currentHtml);
    checkSelectionState();
  };

  const executeCommand = (command: string, valueArg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    document.execCommand(command, false, valueArg);
    handleInput();
    checkSelectionState();
  };

  const handleToggleHeading = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (activeFormats.heading) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<h3>');
    }
    handleInput();
  };

  const handleInsertBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    document.execCommand('insertHTML', false, '<br/><br/>');
    handleInput();
  };

  const insertMathSnippet = (snippet: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(snippet);
      range.insertNode(textNode);

      // Move caret after inserted text node
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand('insertText', false, snippet);
    }

    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeCommand('bold');
      } else if (key === 'i') {
        e.preventDefault();
        executeCommand('italic');
      } else if (key === 'u') {
        e.preventDefault();
        executeCommand('underline');
      }
    }
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

  const minHeight = rows > 5 ? '200px' : '100px';

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

        {/* Text Formatting Toolbar Buttons with Active State */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => executeCommand('bold')}
          style={{
            padding: '3px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: activeFormats.bold ? 'var(--accent)' : undefined,
            color: activeFormats.bold ? '#ffffff' : undefined,
            fontWeight: activeFormats.bold ? 800 : 500
          }}
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} /> Bold
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => executeCommand('italic')}
          style={{
            padding: '3px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: activeFormats.italic ? 'var(--accent)' : undefined,
            color: activeFormats.italic ? '#ffffff' : undefined,
            fontWeight: activeFormats.italic ? 800 : 500
          }}
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} /> Italic
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => executeCommand('underline')}
          style={{
            padding: '3px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: activeFormats.underline ? 'var(--accent)' : undefined,
            color: activeFormats.underline ? '#ffffff' : undefined,
            fontWeight: activeFormats.underline ? 800 : 500
          }}
          title="Underline (Ctrl+U)"
        >
          <Underline size={13} /> Underline
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleToggleHeading}
          style={{
            padding: '3px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: activeFormats.heading ? 'var(--accent)' : undefined,
            color: activeFormats.heading ? '#ffffff' : undefined,
            fontWeight: activeFormats.heading ? 800 : 500
          }}
          title="Heading"
        >
          <Heading size={13} /> Heading
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleInsertBreak}
          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          title="Line Break"
        >
          <CornerDownLeft size={13} /> Line Break
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => executeCommand('insertUnorderedList')}
          style={{
            padding: '3px 8px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: activeFormats.list ? 'var(--accent)' : undefined,
            color: activeFormats.list ? '#ffffff' : undefined,
            fontWeight: activeFormats.list ? 800 : 500
          }}
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
                onClick={() => insertMathSnippet(item.snippet)}
                style={{ padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 }}
                title={`Insert ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Visual ContentEditable Surface & Optional Live Preview */}
      <div style={{ display: showPreview ? 'grid' : 'block', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '10px', width: '100%' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyUp={checkSelectionState}
            onMouseUp={checkSelectionState}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true; }}
            onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
            className="form-input"
            style={{
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              width: '100%',
              minHeight: minHeight,
              padding: '8px 12px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              outline: 'none',
              overflowY: 'auto'
            }}
          />

          {isEmpty && (
            <div
              style={{
                position: 'absolute',
                top: '9px',
                left: '13px',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
                pointerEvents: 'none',
                userSelect: 'none',
                fontStyle: 'italic'
              }}
            >
              {placeholder}
            </div>
          )}
        </div>

        {showPreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{previewTitle}</span>
            <div
              style={{
                padding: '8px 12px',
                minHeight: minHeight,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                color: 'var(--text-main)'
              }}
            >
              {value ? <MathRenderer text={value} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Formatted text preview will render here...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;
