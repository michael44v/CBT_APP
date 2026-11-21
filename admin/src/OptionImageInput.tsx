import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

interface OptionImageInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  onUploadStateChange: (uploading: boolean) => void;
  error?: string;
}

const IMAGE_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i;
const HTML_TAG = /<\/?[a-z][^>]*>/i;
const MAX_SIZE = 5 * 1024 * 1024;
const FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decodeEntity(entity: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = entity;
  return textarea.value;
}

// Keep a raw counterpart for each displayed character, so existing HTML and
// entities survive edits while newly typed characters are always escaped.
function textCharacters(raw: string, html: boolean): { text: string; raw: string[] } {
  if (!html) return { text: raw, raw: raw.split('') };
  const pieces = raw.match(/<\/?[a-z][^>]*>|&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);|[\s\S]/gi) || [];
  let text = '';
  const chars: string[] = [];
  for (const piece of pieces) {
    const decoded = piece.startsWith('&') ? decodeEntity(piece) : piece;
    text += decoded;
    if (piece.startsWith('&') && decoded !== piece) {
      for (let i = 0; i < decoded.length; i++) chars.push(i === 0 ? piece : '');
    } else {
      chars.push(...piece.split(''));
    }
  }
  return { text, raw: chars };
}

function parseValue(value: string, plain = false) {
  if (plain) return { text: value, chars: value.split(''), image: '', src: '', position: value.length, html: false, legacyUrl: false };
  const tag = IMAGE_TAG.exec(value);
  let image = '';
  let src = '';
  let before = value;
  let after = '';
  if (tag) {
    const source = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/i.exec(tag[0]);
    if (source) {
      src = (source[1] ?? source[2] ?? source[3] ?? '').replace(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/gi, decodeEntity);
      if (src.trim()) {
        image = tag[0];
        before = value.slice(0, tag.index);
        after = value.slice(tag.index + tag[0].length);
      }
    }
  }
  const html = !!image && !!tag || HTML_TAG.test(before + after);
  const left = textCharacters(before, html);
  const right = textCharacters(after, html);
  return { text: left.text + right.text, chars: [...left.raw, ...right.raw], image, src, position: left.text.length, html, legacyUrl: !!image && !tag };
}

function imageMarkup(src: string, label: string): string {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" style="max-width: 100%; max-height: 160px; object-fit: contain;" />`;
}

function previewUrl(src: string): string {
  if (/^https?:\/\//i.test(src) || /^data:image\/(?:png|jpeg|webp|gif);/i.test(src)) return src;
  if (/^(?:\/|[\w.-]+\/)/.test(src) && !src.startsWith('//')) {
    return `https://cbt.filloptech.com/${src.replace(/^\/+/, '')}`;
  }
  return '';
}

export default function OptionImageInput({ label, value, onChange, showNotification, onUploadStateChange, error }: OptionImageInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const valueRef = useRef(value);
  // Values entered as plain text must not turn into HTML just because the user typed a tag.
  const plainValueRef = useRef<string | null>(null);
  const callbacks = useRef({ onChange, showNotification, onUploadStateChange });
  callbacks.current = { onChange, showNotification, onUploadStateChange };
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const parse = (nextValue: string) => parseValue(nextValue, plainValueRef.current === nextValue);
  const parsed = parse(value);

  const setValidity = (nextValue: string) => {
    const next = parse(nextValue);
    inputRef.current?.setCustomValidity(next.text.trim() || next.src ? '' : `${label} requires text or an image.`);
  };

  useLayoutEffect(() => {
    setValidity(value);
  }, [value, label]);

  // A parent reset or switch to another record invalidates an in-flight upload.
  useLayoutEffect(() => {
    if (valueRef.current !== value) {
      plainValueRef.current = null;
      valueRef.current = value;
      const controller = activeUpload.current;
      if (controller) {
        activeUpload.current = null;
        controller.abort();
        setUploading(false);
        callbacks.current.onUploadStateChange(false);
      }
    }
  }, [value]);

  useEffect(() => () => {
    const controller = activeUpload.current;
    if (controller) {
      activeUpload.current = null;
      controller.abort();
      callbacks.current.onUploadStateChange(false);
    }
  }, []);

  const emit = (next: string, plain = false) => {
    plainValueRef.current = plain ? next : null;
    valueRef.current = next;
    setValidity(next);
    callbacks.current.onChange(next);
  };

  const editText = (text: string) => {
    const current = parse(valueRef.current);
    let start = 0;
    while (start < current.text.length && start < text.length && current.text[start] === text[start]) start++;
    let end = current.text.length;
    let newEnd = text.length;
    while (end > start && newEnd > start && current.text[end - 1] === text[newEnd - 1]) { end--; newEnd--; }
    const inserted = text.slice(start, newEnd);
    const html = current.html || current.legacyUrl;
    const originalChars = current.legacyUrl ? current.text.split('').map(escapeHtml) : current.chars;
    const chars = [...originalChars.slice(0, start), ...(html ? inserted.split('').map(escapeHtml) : inserted.split('')), ...originalChars.slice(end)];
    let position = current.position;
    if (position > end) position += newEnd - start - (end - start);
    else if (position > start) position = newEnd;
    const image = current.legacyUrl ? imageMarkup(current.src, label) : current.image;
    const next = image
      ? chars.slice(0, position).join('') + image + chars.slice(position).join('')
      : chars.join('');
    emit(next, !image && !html);
  };

  const cancelUpload = () => {
    const controller = activeUpload.current;
    if (!controller) return;
    activeUpload.current = null;
    controller.abort();
    setUploading(false);
    callbacks.current.onUploadStateChange(false);
  };

  const uploadFile = async (file: File) => {
    if (activeUpload.current) return;
    setUploadError('');
    const fail = (message: string) => {
      setUploadError(message);
      callbacks.current.showNotification(message, 'error');
    };
    if (!FILE_TYPES.includes(file.type)) return fail('Please upload a PNG, JPEG, WEBP or GIF image.');
    if (file.size > MAX_SIZE) return fail('Image size exceeds the 5MB limit.');

    const controller = new AbortController();
    activeUpload.current = controller;
    setUploading(true);
    callbacks.current.onUploadStateChange(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', 'futyApp');
      const response = await fetch('https://api.cloudinary.com/v1_1/dguvkirdr/image/upload', {
        method: 'POST', body, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Image upload failed. Please try again.');
      const data: { secure_url?: unknown } = await response.json();
      if (typeof data.secure_url !== 'string') throw new Error('The upload returned an invalid image URL.');
      let url: URL;
      try { url = new URL(data.secure_url); } catch { throw new Error('The upload returned an invalid image URL.'); }
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || url.port) {
        throw new Error('The upload returned an invalid image URL.');
      }
      if (activeUpload.current !== controller) return;
      const current = parse(valueRef.current);
      const chars = current.html ? current.chars : current.text.split('').map(escapeHtml);
      const position = current.image ? current.position : chars.length;
      emit(chars.slice(0, position).join('') + imageMarkup(url.href, label) + chars.slice(position).join(''));
      callbacks.current.showNotification('Image uploaded successfully!', 'success');
    } catch (err) {
      if (activeUpload.current === controller) fail(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      if (activeUpload.current === controller) {
        activeUpload.current = null;
        setUploading(false);
        callbacks.current.onUploadStateChange(false);
      }
    }
  };

  const removeImage = () => {
    cancelUpload();
    const current = parse(valueRef.current);
    const raw = current.chars.join('');
    // Once no HTML remains, restore plain text rather than visible HTML entities.
    const hasHtml = HTML_TAG.test(raw);
    emit(hasHtml ? raw : current.text, !hasHtml);
    setUploadError('');
  };

  const thumbnail = previewUrl(parsed.src);
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" htmlFor={`${id}-text`}>{label}</label>
      <input
        ref={inputRef}
        id={`${id}-text`}
        className="form-input"
        type="text"
        value={parsed.text}
        onChange={(event) => editText(event.target.value)}
        aria-invalid={!!error || !!uploadError}
        aria-describedby={`${id}-help${error || uploadError ? ` ${id}-error` : ''}`}
        placeholder={`${label} text (or upload an image)`}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void uploadFile(file);
          }}
        />
        <button type="button" className="btn btn-secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading...' : parsed.src ? 'Replace image' : 'Upload image'}
        </button>
        {uploading && <button type="button" className="btn btn-secondary" onClick={cancelUpload}>Cancel upload</button>}
        {parsed.src && <button type="button" className="btn btn-danger" onClick={removeImage}>Remove image</button>}
      </div>
      <span id={`${id}-help`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPEG, WEBP or GIF, maximum 5MB.</span>
      {uploading && <span role="status">Uploading image...</span>}
      {thumbnail && <img src={thumbnail} alt={`${label} preview`} style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', alignSelf: 'flex-start' }} />}
      {(error || uploadError) && <span id={`${id}-error`} role="alert" style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{uploadError || error}</span>}
    </div>
  );
}
