
import React, { useState } from 'react';

interface QuestionImageProps {
  imageUrl?: string | null;
  isDarkMode?: boolean;
}

export const resolveImageUrl = (url: string): string => {
  if (!url) return '';

  const trimmed = url.trim();

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  return `https://cbt.filloptech.com/${trimmed.replace(/^\/+/, '')}`;
};

export const isValidImageUrl = (url?: string | null): boolean => {
  if (!url) return false;

  const trimmed = url.trim();

  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  if (
    lower === 'n/a' ||
    lower === 'null' ||
    lower === '-' ||
    lower === 'none' ||
    lower === 'undefined'
  ) {
    return false;
  }

  return true;
};

export const QuestionImage: React.FC<QuestionImageProps> = ({
  imageUrl,
  isDarkMode = false,
}) => {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isValidImageUrl(imageUrl)) {
    return null;
  }

  const fullUrl = resolveImageUrl(imageUrl!);

  return (
    <>
      <div
        style={{
          width: '100%',
          margin: '10px 0 14px',
          background: 'transparent',
        }}
      >
        {/* Hide / Show button */}
        <button
          type="button"
          onClick={() => setIsHidden((prev) => !prev)}
          style={{
            padding: '4px 10px',
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '5px',
            border: `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
            background: 'transparent',
            color: isDarkMode ? '#cbd5e1' : '#475569',
            cursor: 'pointer',
          }}
        >
          {isHidden ? 'Show Image' : 'Hide Image'}
        </button>

        {/* Thumbnail */}
        {!isHidden && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              background: 'transparent',
            }}
          >
            <img
              src={fullUrl}
              alt="Question"
              onClick={() => setIsExpanded(true)}
              style={{
                display: 'block',
                width: 'auto',
                maxWidth: '220px',
                maxHeight: '160px',
                objectFit: 'contain',
                borderRadius: '6px',
                cursor: 'zoom-in',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Full-screen image viewer */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            cursor: 'zoom-out',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label="Close image"
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              border: 'none',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '24px',
              cursor: 'pointer',
              zIndex: 10000,
            }}
          >
            ×
          </button>

          {/* Expanded image */}
          <img
            src={fullUrl}
            alt="Question enlarged"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '6px',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </>
  );
};

export default QuestionImage;
