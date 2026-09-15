export function formatMonthYear(date: Date): string {
  return date
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

export function formatDateLong(date: Date): string {
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

export function formatRange(start: Date, end: Date | undefined, status: 'ongoing' | 'completed'): string {
  const from = formatMonthYear(start);
  if (!end || status === 'ongoing') return `${from} — PRESENT`;
  return `${from} — ${formatMonthYear(end)}`;
}
