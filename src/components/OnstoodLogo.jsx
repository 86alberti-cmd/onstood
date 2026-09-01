import React from 'react';

export default function OnstoodLogo({
  size = 'md',
  suffix = '',
  className = '',
  style = {},
  title = 'OnStood'
}) {
  const heights = {
    xs: 22,
    sm: 30,
    md: 42,
    lg: 64,
    xl: 92
  };

  const height =
    typeof size === 'number'
      ? size
      : (heights[size] || heights.md);

  return (
    <span
      className={`onstood-logo-mark ${className}`.trim()}
      title={title}
      aria-label={suffix ? `OnStood ${suffix}` : 'OnStood'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(5, Math.round(height * 0.12)),
        verticalAlign: 'middle',
        lineHeight: 1,
        maxWidth: '100%',
        ...style
      }}
    >
      <img
        src="/onstood-logo.png"
        alt="OnStood"
        draggable="false"
        style={{
          display: 'block',
          width: 'auto',
          height,
          maxWidth: '100%',
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
      {suffix ? (
        <span
          style={{
            fontSize: Math.max(10, Math.round(height * 0.42)),
            fontWeight: 900,
            letterSpacing: '.04em',
            whiteSpace: 'nowrap'
          }}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}
