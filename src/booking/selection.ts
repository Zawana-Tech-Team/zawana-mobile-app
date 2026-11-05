import type { Availability, Slot } from './types.ts';

export type TimeChoice = Pick<Slot, 'time' | 'startMinute' | 'endMinute' | 'label'>;
/** Presentation only: collect the schedule returned by the server, including hours on future dates. */
export function timeChoices(data: Availability): TimeChoice[] {
  return [...new Map(data.slots.map(s => [s.time, { time: s.time, startMinute: s.startMinute, endMinute: s.endMinute, label: s.label }])).values()].sort((a, b) => a.startMinute - b.startMinute);
}
/** A court can fulfill the selection only when every requested session is reported available. */
export function selectedCourtSlots(days: Availability[], courtId: string, times: string[]): Slot[] | null {
  if (!days.length || !times.length) return null;
  const slots: Slot[] = [];
  for (const day of days) for (const time of times) {
    const slot = day.slots.find(s => s.courtId === courtId && s.time === time);
    if (!slot || !slot.available || slot.status !== 'available') return null;
    slots.push(slot);
  }
  return slots;
}

/** Replace an edited session atomically; a rejected selection leaves the cart intact. */
export function mergeSelectedSlots(previous: Slot[], next: Slot[], limit: number, replaceIds: string[] = []): Slot[] {
  if (!next.length || next.some(s => !s.available || s.status !== 'available')) return previous;
  const merged = [...new Map([...previous.filter(s => !replaceIds.includes(s.id)), ...next].map(s => [s.id, s])).values()];
  return merged.length <= limit ? merged : previous;
}

/** Multi-court presentation is all-or-nothing; the server still validates the atomic submission. */
export function selectedCourtsSlots(days: Availability[], courtIds: string[], times: string[]): Slot[] | null {
  if (!courtIds.length) return null;
  const result: Slot[] = [];
  for (const id of new Set(courtIds)) {
    const slots = selectedCourtSlots(days, id, times);
    if (!slots) return null;
    result.push(...slots);
  }
  return result;
}
