import React from 'react';

export default function OnstoodWordmark({ className = '', style = {} }) {
  return (
    <span
      className={`onstood-wordmark ${className}`.trim()}
      aria-label="OnStood"
      style={{
        display: 'inline',
        font: 'inherit',
        fontWeight: 900,
        letterSpacing: '-0.035em',
        lineHeight: 'inherit',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <span aria-hidden="true" style={{ color: '#168CFF', textTransform: 'none' }}>On</span>
      <span aria-hidden="true" style={{ color: '#162B58', textTransform: 'none' }}>Stood</span>
    </span>
  );
}
