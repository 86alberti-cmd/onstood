import React from 'react';

export function Stat({
  label,
  value,
  onClick
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className="stat"
        onClick={onClick}
        title={`Open ${label}`}
        style={{
          textAlign: 'left',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        <span>{value}</span>
        <small>{label}</small>
      </button>
    );
  }

  return (
    <div className="stat">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}

export function Page({
  eyebrow,
  title,
  children,
  action,
  hideHeading = false
}) {

  return (
    <>
      {!hideHeading && (

        <div className="page-heading">

          <div>

            <span className="eyebrow dark">
              {eyebrow}
            </span>

            <h1>
              {title}
            </h1>

          </div>

          {action}

        </div>

      )}

      {children}
    </>
  );
}

export function CourseTypeBadge({
  type
}) {

  const labels = {
    open: 'OPEN',
    free: 'FREE',
    paid: 'PAID',
    private: 'PRIVATE'
  };


  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 24,
        padding: '4px 9px',
        borderRadius: 999,
        background:
          type === 'paid'
            ? 'rgba(99,102,241,0.12)'
            : type === 'private'
              ? 'rgba(15,23,42,0.08)'
              : 'rgba(34,197,94,0.12)',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.06em'
      }}
    >
      {labels[type] || 'COURSE'}
    </span>
  );
}
