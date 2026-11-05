import type { AttendanceRecord } from './domain.ts';
export const statusColors = { present: '#166534', late: '#B7791F', absent: '#B42336', pending: '#2563EB', excused: '#6B7280' };
export function attendanceMarkers(rows: AttendanceRecord[]) {
  const grouped = new Map<string, AttendanceRecord[]>();
  for (const row of rows) grouped.set(row.date, [...(grouped.get(row.date) ?? []), row]);
  return Object.fromEntries([...grouped].map(([date, records]) => [date, { count: records.length, color: new Set(records.map(r => r.status)).size === 1 ? statusColors[records[0].status] : '#C6A34A' }]));
}
