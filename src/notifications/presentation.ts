import type { Notification } from '../coach/domain.ts';
export type NotificationDestination = { screen: 'booking'; id: string } | { screen: 'bookings' | 'packages' | 'attendance' | 'courses' };
/** Backend web links are translated only through known member destinations. Never open arbitrary URLs. */
export function notificationDestination(item: Pick<Notification, 'link' | 'type' | 'entityId'>): NotificationDestination | null {
 const link = item.link?.split(/[?#]/)[0] ?? '';
 if (!link.startsWith('/') || link.startsWith('//')) return null;
 if (link === '/membership' || link === '/packages') return { screen: 'packages' };
 if (link === '/attendance') return { screen: 'attendance' };
 if (['/bookings', '/private-course', '/courses'].includes(link) || /^\/bookings\/[^/]+$/.test(link)) {
  const id = item.entityId || (link.startsWith('/bookings/') ? decodeURIComponentSafe(link.slice(10)) : null);
  return id && /^[a-zA-Z0-9_-]+$/.test(id) ? { screen: 'booking', id } : { screen: link === '/private-course' || link === '/courses' ? 'courses' : 'bookings' };
 }
 return null;
}
const decodeURIComponentSafe = (text: string) => { try { return decodeURIComponent(text); } catch { return ''; } };
export function notificationCategory(item: Pick<Notification, 'type' | 'link'>) {
 if (item.link === '/membership' || item.type?.includes('package')) return 'package';
 if (item.type?.includes('payment')) return 'payment';
 if (item.type?.includes('course') || item.type?.includes('coach') || item.type?.includes('training')) return 'coaching';
 if (item.type?.includes('booking') || item.link?.startsWith('/bookings')) return 'booking';
 return 'announcement';
}
export function notificationGroup(createdAt: string, now = new Date()) {
 const key = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon', year: 'numeric', month: '2-digit', day: '2-digit' });
 const date = new Date(createdAt);
 if (!Number.isFinite(date.getTime())) return 'Earlier';
 if (key(date) === key(now)) return 'Today';
 if (key(date) === key(new Date(now.getTime() - 86400000))) return 'Yesterday';
 return 'Earlier';
}
export function relativeTimestamp(createdAt: string, now = new Date()) {
 const date = new Date(createdAt), minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
 if (!Number.isFinite(minutes)) return '';
 if (minutes < 1) return 'Just now';
 if (minutes < 60) return `${minutes}m ago`;
 if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
 return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}), timeZone: 'Asia/Yangon' });
}
