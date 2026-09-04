import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const LABELS = {
  private: 'Only me',
  only_me: 'Only me',
  connections: 'Connections',
  public: 'Public'
};

export default function PrivacyControl({
  value,
  onChange,
  privateValue = 'only_me',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const positionMenu = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = 150;
    const estimatedHeight = 116;
    const gap = 5;
    const viewportPadding = 8;
    const roomBelow = window.innerHeight - rect.bottom;
    const openUpward = roomBelow < estimatedHeight + gap + viewportPadding;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding
    );

    setMenuStyle({
      position: 'fixed',
      left,
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      zIndex: 2147483000,
      width,
      padding: 5,
      borderRadius: 10,
      border: '1px solid rgba(148,163,184,.28)',
      background: '#fff',
      boxShadow: '0 12px 34px rgba(15,23,42,.2)'
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    positionMenu();

    // Recalculate only when the viewport itself changes. During page scroll we
    // close the tiny owner popover instead of calling setState on every scroll
    // event. This keeps large feeds from re-rendering while the user scrolls.
    const reposition = () => positionMenu();
    const closeOnScroll = () => setOpen(false);

    window.addEventListener('resize', reposition, { passive: true });
    window.addEventListener('scroll', closeOnScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const close = event => {
      const inTrigger = rootRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };

    const onKey = event => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = [
    { value: privateValue, label: 'Only me' },
    { value: 'connections', label: 'Connections' },
    { value: 'public', label: 'Public' }
  ];

  const menu = open && !disabled && menuStyle ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Privacy"
      style={menuStyle}
      onClick={event => event.stopPropagation()}
    >
      {options.map(option => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="menuitem"
            onClick={async event => {
              event.stopPropagation();
              setOpen(false);
              if (!selected) await onChange?.(option.value);
            }}
            style={{
              width: '100%',
              border: 0,
              borderRadius: 7,
              background: selected ? 'rgba(79,70,229,.08)' : 'transparent',
              padding: '7px 9px',
              textAlign: 'left',
              fontSize: 11.5,
              fontWeight: selected ? 800 : 600,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {selected ? '✓ ' : ''}{option.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <span
        ref={rootRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center'
        }}
        onClick={event => event.stopPropagation()}
      >
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={event => {
            event.stopPropagation();
            setOpen(current => !current);
          }}
          title={`Privacy: ${LABELS[value] || 'Only me'}`}
          style={{
            border: 0,
            background: 'transparent',
            padding: '2px 3px',
            margin: 0,
            color: 'var(--muted, #64748b)',
            fontSize: 10,
            lineHeight: 1.2,
            fontWeight: 700,
            cursor: disabled ? 'default' : 'pointer',
            textDecoration: 'underline',
            textDecorationThickness: '1px',
            textUnderlineOffset: 2,
            opacity: disabled ? 0.55 : 0.9
          }}
        >
          Privacy
        </button>
      </span>

      {menu && typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
