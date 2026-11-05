export function calendarDays(month: string): (string | null)[] {
  const first = new Date(`${month}-01T12:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const start = first.getUTCDay();
  return Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, i) => i < start || i >= start + count ? null : `${month}-${String(i - start + 1).padStart(2, '0')}`);
}
