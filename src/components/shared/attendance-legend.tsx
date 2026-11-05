import { Text, View } from 'react-native';
import { statusColors } from '@/attendance/calendar';
export function AttendanceLegend() {
  const labels = { present: 'Present', late: 'Late', absent: 'Absent', pending: 'Not recorded', excused: 'Excused', mixed: 'Mixed' };
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{Object.entries({ ...statusColors, mixed: '#C6A34A' }).map(([status, color]) => <View key={status} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} /><Text style={{ fontSize: 11, color: '#6B7280' }}>{labels[status as keyof typeof labels]}</Text></View>)}</View>;
}
