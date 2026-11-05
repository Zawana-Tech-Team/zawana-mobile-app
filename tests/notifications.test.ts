import { memberBookingHref } from '../src/booking/member-navigation.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationCategory, notificationDestination, notificationGroup, relativeTimestamp } from '../src/notifications/presentation.ts';
const item = (link: string | null, entityId: string | null = null, type: string | null = 'booking') => ({ link, entityId, type });
test('notification destinations translate only supported member web routes', () => {
 assert.deepEqual(notificationDestination(item('/bookings', 'booking_123')), { screen: 'booking', id: 'booking_123' });
 assert.deepEqual(notificationDestination(item('/bookings/booking_456?source=notice')), { screen: 'booking', id: 'booking_456' });
 assert.deepEqual(notificationDestination(item('/membership', 'purchase_123', 'payment')), { screen: 'packages' });
 assert.deepEqual(notificationDestination(item('/private-course', 'course_123')), { screen: 'booking', id: 'course_123' });
 assert.deepEqual(notificationDestination(item('/bookings')), { screen: 'bookings' });
 assert.deepEqual(notificationDestination(item('/attendance')), { screen: 'attendance' });
});
test('unknown, staff, external and malformed notification destinations never become mobile links', () => {
 for (const link of [null, '//evil.example/bookings', 'https://thezawana.com/bookings', '/coach/schedule', '/cafe-order', '/bookings/a/b', 'javascript:alert(1)']) assert.equal(notificationDestination(item(link)), null);
 assert.deepEqual(notificationDestination(item('/bookings/%2Fadmin')), { screen: 'bookings' });
 assert.deepEqual(notificationDestination(item('/bookings/%broken')), { screen: 'bookings' });
});
test('notification categories reflect actual backend type and package links', () => {
 assert.equal(notificationCategory(item('/membership', null, 'payment')), 'package');
 assert.equal(notificationCategory(item('/bookings', null, 'payment')), 'payment');
 assert.equal(notificationCategory(item('/bookings', null, 'private_course_confirmed')), 'coaching');
 assert.equal(notificationCategory(item(null, null, 'announcement')), 'announcement');
});
test('notification chronological groups follow Yangon day boundaries independently of device timezone', () => {
 const now = new Date('2026-10-30T18:00:00Z');
 assert.equal(notificationGroup('2026-10-30T17:59:00Z', now), 'Today');
 assert.equal(notificationGroup('2026-10-30T17:00:00Z', now), 'Yesterday');
 assert.equal(notificationGroup('2026-10-28T17:00:00Z', now), 'Earlier');
 assert.equal(notificationGroup('invalid', now), 'Earlier');
 assert.equal(relativeTimestamp('2026-10-30T17:58:00Z', now), '2m ago');
 assert.equal(relativeTimestamp('2026-10-30T19:00:00Z', now), 'Just now');
});

test('known private course and court records open their own workflows', () => {
 assert.deepEqual(memberBookingHref({id:'private_1',kind:'private_course'}),{pathname:'/(member)/courses',params:{id:'private_1'}});
 assert.deepEqual(memberBookingHref({id:'court_1',kind:'court'}),{pathname:'/(member)/bookings/[id]',params:{id:'court_1'}});
 assert.equal(memberBookingHref({id:'gym_1',kind:'pt'}),'/(member)/bookings');
});
