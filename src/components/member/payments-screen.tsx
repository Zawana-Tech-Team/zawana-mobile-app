import { memberBookingHref } from "@/booking/member-navigation";
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useDashboard } from './use-dashboard';
import { MemberPage, Notice, money, shortDate } from './ui';
import { Segments } from '../shared/controls';
import { DetailSheet, QuietRow, q } from '../shared/quiet-ui';
import { Fact } from '../attendance/ui';
/** Displays records, not inferred cash receipts or a locally calculated financial ledger. */
export function MemberPaymentsScreen() {
 const resource = useDashboard(), [tab, setTab] = useState('bookings'), [purchaseId, setPurchaseId] = useState<string | null>(null);
 const purchase = resource.data?.purchases.find(item => item.id === purchaseId);
 return <MemberPage title="Payment records." sectionLabel="YOUR RECORDS" tab="Profile" back>
  <Segments label="Payment records" value={tab} onChange={setTab} options={[{ value: 'bookings', label: 'Bookings' }, { value: 'packages', label: 'Packages' }]} />
  <Notice loading={resource.loading} error={resource.error} onRetry={resource.retry} />
  {tab === 'bookings' ? resource.data?.bookings.map(item => <QuietRow key={item.id} title={item.title} subtitle={`${shortDate(item.date)} · ${item.paymentStatus}`} icon="calendar" onPress={() => router.push(memberBookingHref(item))} />) : resource.data?.purchases.map(item => <QuietRow key={item.id} title={item.packageName} subtitle={`${shortDate(item.createdAt)} · ${item.paidAt ? 'Paid' : 'Payment at venue'}`} icon="retail" onPress={() => setPurchaseId(item.id)} />)}
  {resource.data && !(tab === 'bookings' ? resource.data.bookings.length : resource.data.purchases.length) ? <Text style={q.caption}>No records in this view.</Text> : null}
  <DetailSheet title="Package payment record" visible={!!purchase} onClose={() => setPurchaseId(null)}>{purchase ? <><Text style={q.label}>{purchase.packageName}</Text><Fact label="Reference" value={purchase.code} /><Fact label="Package price" value={money(purchase.price)} /><Fact label="Payment method" value={purchase.paymentMethod} /><Fact label="Payment" value={purchase.paidAt ? `Paid · ${shortDate(purchase.paidAt)}` : 'Arrange with the venue'} /></> : null}</DetailSheet>
 </MemberPage>;
}
