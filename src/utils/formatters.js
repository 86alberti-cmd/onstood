export function fmtDate(value) {
  if (!value) return '';

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);

  } catch {
    return '';
  }
}

export function safeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

export function safeDay(value) {
  const date =
    safeDate(value);

  return date
    ? date.getDate()
    : '—';
}

export function safeMonth(value) {
  const date =
    safeDate(value);

  if (!date) {
    return '';
  }

  try {
    return date.toLocaleString(
      'en',
      {
        month: 'short'
      }
    );
  } catch {
    return '';
  }
}
