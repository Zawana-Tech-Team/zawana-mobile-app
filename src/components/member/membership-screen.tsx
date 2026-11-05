import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import type { DashboardPackage } from '@/auth/types';
import { mediaUrl } from '@/booking/media';
import { useFormTask } from '@/hooks/use-form-task';
import { brand } from '@/design/tokens';
import { useDashboard } from './use-dashboard';
import { Button, Confirm, MemberPage, Notice, money, shortDate } from './ui';
import { Fact } from '../attendance/ui';
import { f } from '../booking/flow-ui';
import { Segments } from '../shared/controls';
import { BalanceRing, DetailSheet, QuietRow, Reveal } from '../shared/quiet-ui';

export function MembershipScreen() {
 const { api } = useAuth(), dashboard = useDashboard(), task = useFormTask();
 const [tab, setTab] = useState('packages'), [category, setCategory] = useState('all'), [selected, setSelected] = useState<DashboardPackage | null>(null), [success, setSuccess] = useState<string | null>(null);
 const [enrollmentId, setEnrollmentId] = useState<string | null>(null), [packageId, setPackageId] = useState<string | null>(null), [purchaseId, setPurchaseId] = useState<string | null>(null);
 const data = dashboard.data;
 const enrollments = [...new Map([...(data?.enrollmentHistory ?? []), ...(data?.enrollment ? [data.enrollment] : [])].map(e => [e.id, e])).values()];
 const categories = [...new Map((data?.packages ?? []).flatMap(p => p.category ? [[p.category.id, p.category.name] as const] : [])).entries()];
 const packages = data?.packages.filter(p => category === 'all' || p.categoryId === category) ?? [];
 const enrollment = enrollments.find(e => e.id === enrollmentId), pkg = data?.packages.find(p => p.id === packageId), purchase = data?.purchases.find(p => p.id === purchaseId);
 return <MemberPage title="Your packages." tab="Badminton" back>
  <Segments label="Package sections" value={tab} onChange={setTab} options={[{ value: 'packages', label: 'My packages' }, { value: 'explore', label: 'Explore' }, { value: 'history', label: 'History' }]} />
  <Notice loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} />
  {success ? <View style={f.card} accessibilityLiveRegion="polite"><Text style={f.strong}>{success}</Text></View> : null}
  <Reveal key={`${tab}:${category}`}>
   {tab === 'packages' ? <>
    {enrollments.map(e => <QuietRow key={e.id} testID={`package-pass-${e.id}`} title={e.packageName} subtitle={`${e.status} · Until ${shortDate(e.expiryDate)}`} trailing={<BalanceRing remaining={e.sessionsRemaining} total={e.sessionsTotal} />} onPress={() => setEnrollmentId(e.id)} />)}
    {data && !enrollments.length ? <View style={f.card}><Text style={f.title}>Your next chapter on court.</Text><Button label="Explore packages" onPress={() => setTab('explore')} /></View> : null}
    <Button label="Scan front desk QR" onPress={() => router.push('/(member)/check-in')} />
   </> : tab === 'explore' ? <>
    <Segments label="Package categories" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All' }, ...categories.map(([value, label]) => ({ value, label }))]} />
    {packages.map(p => <QuietRow key={p.id} title={p.title} subtitle={`${p.sessions} sessions · ${p.validity} days${p.status === 'coming_soon' ? ' · Coming soon' : ''}`} trailing={<Text style={{ color: brand.navy, fontWeight: '700', fontSize: 13 }}>{money(p.price)}</Text>} onPress={() => setPackageId(p.id)} />)}
    {data && !packages.length ? <Text style={f.caption}>No packages in this category right now.</Text> : null}
   </> : <>
    {data?.purchases.map(p => <QuietRow key={p.id} title={p.packageName} subtitle={`${shortDate(p.createdAt)} · ${p.paidAt ? 'Paid' : 'Payment at venue'}`} onPress={() => setPurchaseId(p.id)} />)}
    {data && !data.purchases.length ? <View style={f.card}><Text style={f.title}>No package history yet.</Text></View> : null}
   </>}
  </Reveal>
  <DetailSheet title="Package details" visible={!!enrollment} onClose={() => setEnrollmentId(null)}>{enrollment ? <><Text style={f.title}>{enrollment.packageName}</Text><BalanceRing remaining={enrollment.sessionsRemaining} total={enrollment.sessionsTotal} /><Fact label="Sessions remaining" value={`${enrollment.sessionsRemaining} of ${enrollment.sessionsTotal}`} /><Fact label="Status" value={enrollment.status} /><Fact label="Valid from" value={shortDate(enrollment.startDate)} /><Fact label="Valid until" value={shortDate(enrollment.expiryDate)} /><Text style={f.caption}>Your balance and eligible package are verified by ZAWANA at check-in.</Text><Button secondary label="Attendance & package usage" onPress={() => { setEnrollmentId(null); router.push('/(member)/attendance'); }} /></> : null}</DetailSheet>
  <DetailSheet title="Explore package" visible={!!pkg} onClose={() => setPackageId(null)}>{pkg ? <>
   {pkg.imageUrl ? <Image source={{ uri: mediaUrl(pkg.imageUrl) }} contentFit="cover" style={{ height: 150, width: '100%', borderRadius: 16 }} /> : null}<Text style={f.title}>{pkg.title}</Text><Text style={f.caption}>{pkg.description}</Text><Fact label="Package price" value={money(pkg.price)} /><Fact label="Includes" value={`${pkg.sessions} sessions · ${pkg.validity} days`} />{pkg.scheduleNotes ? <Text style={f.caption}>{pkg.scheduleNotes}</Text> : null}{pkg.courtRules ? <Text style={f.caption}>{pkg.courtRules}</Text> : null}<Button label={pkg.status === 'coming_soon' ? 'Coming soon' : 'Review package'} disabled={pkg.status !== 'active' || pkg.category?.active === false} onPress={() => { task.setError(null); setPackageId(null); setSelected(pkg); }} />
  </> : null}</DetailSheet>
  <DetailSheet title="Package record" visible={!!purchase} onClose={() => setPurchaseId(null)}>{purchase ? <><Text style={f.title}>{purchase.packageName}</Text><Fact label="Reference" value={purchase.code} /><Fact label="Price" value={money(purchase.price)} /><Fact label="Recorded" value={shortDate(purchase.createdAt)} /><Fact label="Status" value={purchase.status} /><Fact label="Payment" value={purchase.paidAt ? `Paid · ${shortDate(purchase.paidAt)}` : 'Arrange with the venue'} /></> : null}</DetailSheet>
  <Confirm visible={!!selected} title={selected?.title ?? ''} body={selected ? `${selected.sessions} sessions · ${selected.validity} days · ${money(selected.price)}. Online checkout is currently disabled by ZAWANA. This activates the package immediately; arrange payment with the venue.` : ''} label="Activate package" busy={task.loading} error={task.error} onClose={() => setSelected(null)} onConfirm={() => void task.run(async () => { if (!selected) return; await api.purchaseBadmintonPackage(selected.id); setSuccess(`${selected.title} is active. Payment arrangements remain with the venue.`); setSelected(null); setTab('packages'); dashboard.retry(); })} />
 </MemberPage>;
}
