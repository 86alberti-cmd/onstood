import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function PhotoViewer({
  src,
  alt = 'Photo',
  onClose
}) {
  useEffect(() => {
    if (!src) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [src, onClose]);

  if (!src) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40000,
        background:
          'rgba(5, 8, 18, .92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(14px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))',
        cursor: 'zoom-out'
      }}
    >
      <button
        type="button"
        className="icon-btn"
        aria-label="Close photo"
        title="Close"
        onClick={event => {
          event.stopPropagation();
          onClose?.();
        }}
        style={{
          position: 'fixed',
          top:
            'max(14px, env(safe-area-inset-top))',
          right:
            'max(14px, env(safe-area-inset-right))',
          zIndex: 40001,
          background: '#fff'
        }}
      >
        <X size={20} />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={event =>
          event.stopPropagation()
        }
        style={{
          display: 'block',
          maxWidth: '96vw',
          maxHeight: '92dvh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow:
            '0 24px 80px rgba(0,0,0,.48)',
          cursor: 'default'
        }}
      />
    </div>
  );
}
