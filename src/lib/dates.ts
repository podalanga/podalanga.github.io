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

/** DDDD:HH:MM:SS elapsed between epoch and now (clamped to 0 if now precedes epoch). */
export function formatUptime(epoch: Date, now: Date): string {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - epoch.getTime()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(days).padStart(4, '0')}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
