import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { AuthIcon, type AuthIconName } from '../auth/ui/auth-icon';
import { SelectionPressable } from '../booking/selection-pressable';
import { CourtSurface } from '../booking/court-plan';
import { brand } from '@/design/tokens';
import { MemberPage, Reveal } from './ui';

export function BadmintonScreen() {
  return <MemberPage title="Badminton." subtitle="Your court. Your club. Your next level." tab="Services" back>
    <Reveal><SelectionPressable testID="badminton-court-rental" accessibilityRole="button" accessibilityLabel="Badminton court rental" onPress={() => router.push('/(member)/book')} style={s.hero}>
      <Image source={require('../../../assets/facilities/court.webp')} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[`${brand.navy}10`,`${brand.navy}F5`]} style={StyleSheet.absoluteFill} />
      <View style={s.heroCopy}><Text style={s.eyebrow}>PLAY YOUR WAY</Text><Text style={s.heroTitle}>A court for your game.</Text><Text style={s.heroBody}>Choose your time. Bring your people.</Text><View style={s.heroAction}><Text style={s.heroLink}>Court rental</Text><AuthIcon name="arrow" color={brand.gold} size={22} /></View></View>
    </SelectionPressable></Reveal>
    <Text style={s.section}>MORE WAYS TO PLAY</Text>
    <View style={s.grid}>
      <View style={s.cell}><Reveal delay={70}><ServiceCard name="Packages" detail="Find your rhythm." icon="retail" testID="badminton-packages" onPress={() => router.push('/(member)/membership')} /></Reveal></View>
      <View style={s.cell}><Reveal delay={110}><ServiceCard name="Check-in" detail="Scan. Step on court." icon="check" testID="badminton-check-in" onPress={() => router.push('/(member)/check-in')} /></Reveal></View>
    </View>
    <Reveal delay={150}><SelectionPressable testID="badminton-private-course" accessibilityRole="button" accessibilityLabel="Private course" onPress={() => router.push('/(member)/private-course')} style={s.coaching}>
      <View style={{ flex: 1, gap: 9 }}><Text style={s.section}>TRAIN WITH PURPOSE</Text><Text style={s.coachTitle}>Private course</Text><Text style={s.body}>A coach. A plan. Your progress.</Text><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 7 }}><Text style={s.link}>Find your coach</Text><AuthIcon name="arrow" color={brand.accent} size={18} /></View></View><View style={s.miniCourt}><CourtSurface floor="2nd Floor" /></View>
    </SelectionPressable></Reveal>
  </MemberPage>;
}
function ServiceCard({ name, detail, icon, testID, onPress }: { name: string; detail: string; icon: AuthIconName; testID: string; onPress: () => void }) {
  return <SelectionPressable testID={testID} accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={s.card}><View style={s.icon}><AuthIcon name={icon} color={brand.accent} size={25} /></View><Text style={s.cardTitle}>{name}</Text><Text style={s.body}>{detail}</Text><View style={{ alignSelf: 'flex-end' }}><AuthIcon name="arrow" color={brand.ink} size={18} /></View></SelectionPressable>;
}
const s = StyleSheet.create({
  hero: { minHeight: 235, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' }, heroCopy: { padding: 22, gap: 10 }, eyebrow: { fontSize: 9, letterSpacing: 2, color: '#DFC991', fontWeight: '700' }, heroTitle: { fontSize: 29, lineHeight: 34, fontWeight: '700', color: '#FFFFFF', letterSpacing: -.8, maxWidth: 230 }, heroBody: { fontSize: 12, color: '#D3D5D8', lineHeight: 19 }, heroAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }, heroLink: { fontSize: 14, fontWeight: '700', color: '#E7CE94' },
  section: { color: brand.accent, fontSize: 9, letterSpacing: 1.6, fontWeight: '700' }, grid: { flexDirection: 'row', gap: 12 }, cell: { flex: 1 }, card: { minHeight: 172, padding: 18, gap: 9, borderRadius: 21, borderWidth: 1, borderColor: brand.border }, icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: brand.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, cardTitle: { color: brand.ink, fontSize: 18, fontWeight: '700', letterSpacing: -.4 }, body: { fontSize: 11, color: brand.muted, lineHeight: 18 }, coaching: { padding: 22, borderWidth: 1, borderColor: '#E4D9BE', borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 14 }, coachTitle: { color: brand.ink, fontSize: 23, fontWeight: '700', letterSpacing: -.5 }, link: { color: brand.accent, fontSize: 12, fontWeight: '600' }, miniCourt: { width: 67, transform: [{ rotate: '10deg' }], borderRadius: 9, padding: 4, backgroundColor: '#E8DFC9' },
});
