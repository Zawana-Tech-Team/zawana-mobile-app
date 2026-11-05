import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { brand } from '@/design/tokens';
import { SelectionPressable } from '../booking/selection-pressable';
import { AuthIcon } from '../auth/ui/auth-icon';
import { MemberPage, Reveal } from './ui';
const coming = [
 { title: 'High Performance Gym', detail: 'Strength. Built with purpose.', image: require('../../../assets/facilities/gym.webp') },
 { title: 'Revive Clinic', detail: 'Recover. Return stronger.', image: require('../../../assets/facilities/revive.webp') },
 { title: 'ZAWANA Café', detail: 'A pause between sessions.', image: require('../../../assets/facilities/cafe.webp') },
];
export function ServicesScreen() {
 const { width } = useWindowDimensions();
 return <MemberPage title="Find your next move." subtitle="The ZAWANA sports ecosystem." tab="Services" wide sectionLabel="SERVICES">
  <Reveal><SelectionPressable accessibilityRole="button" accessibilityLabel="Explore Badminton" testID="service-badminton" onPress={() => router.push('/(member)/badminton')} style={s.hero}>
   <Image source={require('../../../assets/facilities/court.webp')} contentFit="cover" style={StyleSheet.absoluteFill} /><LinearGradient colors={['#10174710', '#101747F5']} style={StyleSheet.absoluteFill} />
   <View style={s.copy}><Text style={s.availability}>AVAILABLE NOW</Text><Text style={s.title}>Badminton</Text><Text style={s.description}>Courts, coaching and your club.</Text><View style={s.action}><Text style={s.cta}>Explore Badminton</Text><AuthIcon name="arrow" color={brand.gold} /></View></View>
  </SelectionPressable></Reveal>
  <Text style={s.section}>MORE TO COME</Text><View style={{ flexDirection: width >= 768 ? 'row' : 'column', gap: 16 }}>
   {coming.map(item => <View key={item.title} style={[s.card, width >= 768 && { flex: 1 }]} accessibilityLabel={`${item.title}. Coming Soon. Not available for booking.`}>
    <Image source={item.image} contentFit="cover" style={{ width: '100%', height: width >= 768 ? 130 : 150 }} /><View style={{ padding: 18, gap: 7 }}><Text style={s.badge}>COMING SOON</Text><Text style={s.name}>{item.title}</Text><Text style={s.detail}>{item.detail}</Text></View>
   </View>)}
  </View>
 </MemberPage>;
}
const s = StyleSheet.create({
 hero: { minHeight: 260, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' }, copy: { padding: 24, gap: 10 },
 availability: { fontSize: 10, color: '#FFE2A0', letterSpacing: 1.6, fontWeight: '700' }, title: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -1 }, description: { color: '#E1E3EE', fontSize: 14 },
 action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }, cta: { color: '#FFE2A0', fontWeight: '700', fontSize: 14 }, section: { fontSize: 10, color: brand.muted, fontWeight: '700', letterSpacing: 2 },
 card: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: brand.border, backgroundColor: brand.surface }, badge: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: brand.muted }, name: { fontSize: 19, fontWeight: '700', color: brand.navy }, detail: { fontSize: 12, color: brand.muted, lineHeight: 19 },
});
