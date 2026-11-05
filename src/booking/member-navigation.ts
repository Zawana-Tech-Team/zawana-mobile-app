/** Route known booking kinds to the matching existing member workflow. */
export function memberBookingHref(booking: { id: string; kind: string }) {
 if (booking.kind === 'court') return { pathname: '/(member)/bookings/[id]' as const, params: { id: booking.id } };
 if (booking.kind === 'private_course') return { pathname: '/(member)/courses' as const, params: { id: booking.id } };
 return '/(member)/bookings' as const;
}
