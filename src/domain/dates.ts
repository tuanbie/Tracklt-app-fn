/** "2026-10" — month bucket key in local time. */
export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(key: string): { from: number; to: number } {
  const [y, m] = key.split('-').map(Number);
  return { from: new Date(y, m - 1, 1).getTime(), to: new Date(y, m, 1).getTime() };
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1).getTime());
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  return short ? `T${m}` : `Tháng ${m}/${y}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function dayLabel(ts: number, now = Date.now()): string {
  const startOf = (t: number) => new Date(new Date(t).toDateString()).getTime();
  const diff = Math.round((startOf(now) - startOf(ts)) / 86_400_000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return formatDate(ts);
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${formatDate(ts)}`;
}
