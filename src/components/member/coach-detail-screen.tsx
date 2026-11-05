import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useResource } from '@/booking/use-resource';
import { mediaUrl } from '@/booking/media';
import { brand } from '@/design/tokens';
import { f } from '../booking/flow-ui';
import { Button, MemberPage, Notice, money } from './ui';

export function CoachDetailScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId?: string }>();
  const { api, user } = useAuth();
  const catalog = useResource(useCallback((signal: AbortSignal) => api.getPrivateCourses({ signal }), [api]), user?.id ?? '', !!user);
  const courses = catalog.data?.filter(c => c.status === 'active' && c.coaches.some(coach => coach.id === id && coach.status === 'active' && coach.department === 'Badminton')) ?? [];
  const coach = courses.flatMap(c => c.coaches).find(c => c.id === id);
  const course = courses.find(c => c.id === courseId) ?? courses[0];
  return <MemberPage title="Meet your coach." subtitle="Find the right support for your game." tab="Badminton" back footer={coach && course ? <Button label="Choose this coach" testID="choose-profile-coach" onPress={() => router.dismissTo({ pathname: '/(member)/private-course', params: { profileCoachId: coach.id, profileCourseId: course.id } })} /> : undefined}>
    <Notice loading={catalog.loading} error={catalog.error} onRetry={catalog.retry} />
    {coach ? <>
      <View style={[f.hero, { alignItems: 'center', paddingVertical: 30 }]}>
        {coach.imageUrl ? <Image source={{ uri: mediaUrl(coach.imageUrl) }} contentFit="cover" style={{ height: 122, width: 122, borderRadius: 61, borderWidth: 2, borderColor: brand.gold }} /> : <View style={{ height: 108, width: 108, borderRadius: 54, borderWidth: 1, borderColor: brand.gold, backgroundColor: '#1D285E', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: brand.gold, fontSize: 34, fontWeight: '600' }}>{coach.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</Text></View>}
        <Text style={[f.kicker, { color: brand.gold }]}>{coach.department.toUpperCase()} COACH</Text><Text style={[f.heroTitle, { textAlign: 'center' }]}>{coach.name}</Text><Text style={[f.heroBody, { textAlign: 'center' }]}>{coach.specialty}</Text>
      </View>
      <Text style={f.title}>Train with {coach.name.split(' ')[0]}.</Text><Text style={f.caption}>Choose from this coach’s eligible courses. Available dates, courts and times are checked as you book.</Text>
      {courses.map(c => <View key={c.id} style={[f.card, c.id === course?.id && { borderColor: brand.gold }]}><Text style={f.kicker}>{c.category}</Text><Text style={f.title}>{c.title}</Text><Text style={f.caption}>{c.description}</Text><Text style={f.strong}>{c.duration} minutes · {money(c.price)}</Text><Button secondary label={c.id === courseId ? 'Continue with this course' : 'Choose this course'} onPress={() => router.dismissTo({ pathname: '/(member)/private-course', params: { profileCoachId: coach.id, profileCourseId: c.id } })} /></View>)}
    </> : catalog.data ? <View style={f.card}><Text style={f.title}>Coach unavailable.</Text><Text style={f.caption}>Choose another coach from the current course catalog.</Text><Button label="Choose another coach" onPress={() => router.dismissTo('/(member)/private-course')} /></View> : null}
  </MemberPage>;
}
