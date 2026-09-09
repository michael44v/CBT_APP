import React, { useState } from 'react';

interface QuestionImageProps {
  imageUrl?: string | null;
  isDarkMode?: boolean;
}

export const resolveImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `https://cbt.filloptech.com/${trimmed.replace(/^\/+/, '')}`;
};

export const isValidImageUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'n/a' || lower === 'null' || lower === '-' || lower === 'none' || lower === 'undefined') {
    return false;
  }
  return true;
};

export const QuestionImage: React.FC<QuestionImageProps> = ({ imageUrl, isDarkMode = false }) => {
  const [isHidden, setIsHidden] = useState(false);

  if (!isValidImageUrl(imageUrl)) {
    return null;
  }

  const fullUrl = resolveImageUrl(imageUrl!);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if ((window as any).api && (window as any).api.openExternal) {
      (window as any).api.openExternal(fullUrl);
    } else {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        margin: '16px 0 24px',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
        border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '13px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-all', maxWidth: '80%' }}>
          <span style={{ fontWeight: 700, color: isDarkMode ? '#94a3b8' : '#64748b' }}>📷 Image Link:</span>
          <a
            href={fullUrl}
            onClick={handleLinkClick}
            style={{
              color: '#2563eb',
              textDecoration: 'underline',
              fontWeight: 600
            }}
          >
            {fullUrl} ↗
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsHidden(prev => !prev)}
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '4px',
            border: `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
            color: isDarkMode ? '#f1f5f9' : '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          {isHidden ? '👁️ Show Image' : '🙈 Hide Image'}
        </button>
      </div>

      {!isHidden && (
        <div style={{ width: '100%', textAlign: 'center', marginTop: '4px' }}>
          <img
            src={fullUrl}
            alt="Question Attachment"
            style={{
              maxHeight: '280px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '6px',
              border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default QuestionImage;
