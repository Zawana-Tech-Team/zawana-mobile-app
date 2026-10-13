import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRegistrationDraft } from '@/auth/registration-draft';
import { setPendingProfilePhoto } from '@/auth/profile-photo';
import { useFormTask } from '@/hooks/use-form-task';
import { AuthErrorMessage, AuthIcon, AuthLayout, PrimaryButton, authColors, type AuthIconName } from '../ui';

const interests: { label: string; icon: AuthIconName }[] = [
  { label: 'Badminton', icon: 'badminton' },
  { label: 'Gym & Fitness', icon: 'dumbbell' },
  { label: 'Coaching', icon: 'person' },
  { label: 'Physiotherapy', icon: 'heart' },
  { label: 'Sports Retail', icon: 'retail' },
  { label: 'Café', icon: 'cafe' },
];
export function ProfileSetupScreen() {
  const { draft, update } = useRegistrationDraft();
  const task = useFormTask();
  const pick = () => task.run(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
      setPendingProfilePhoto(asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : null);
      update({ avatarUri: asset.uri });
    }
  });
  return <AuthLayout
    title="Complete Your Profile"
    description={'This helps us personalise your\nZAWANA experience.'}
    centered
    onBack={() => router.back()}
    progress={{ step: 2, total: 3 }}
    contentStyle={{ paddingTop: 24 }}
    logoSize={118}
    testID="profile-setup-screen"
  >
    <Text style={styles.label}>Profile Photo <Text style={styles.optional}>(Optional)</Text></Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add profile photo"
      onPress={pick}
      disabled={task.loading}
      style={styles.photo}
    >
      {draft.avatarUri ? <Image
        source={{ uri: draft.avatarUri }}
        contentFit="cover"
        style={{ width: '100%', height: '100%' }}
      /> : <>
        <AuthIcon name="camera" size={30} color={authColors.muted} />
        <Text style={styles.photoText}>Add Photo</Text>
      </>}
    </Pressable>
    <Text style={styles.label}>Select your interests <Text style={styles.optional}>(Optional)</Text></Text>
    <View style={styles.grid}>
      {interests.map(({ label, icon }) => {
        const selected = draft.interests?.includes(label) ?? false;
        return <Pressable
          key={label}
          accessibilityRole="checkbox"
          accessibilityLabel={label}
          accessibilityState={{ checked: selected }}
          onPress={() => update({
            interests: selected ? draft.interests?.filter(item => item !== label) : [...(draft.interests ?? []), label]
          })}
          style={[styles.interest, selected && styles.selected]}
        >
          <AuthIcon name={icon} size={24} color={selected ? authColors.goldDark : authColors.navy} />
          <Text style={styles.interestText}>{label}</Text>
        </Pressable>;
      })}
    </View>
    <AuthErrorMessage message={task.error} />
    <PrimaryButton
      label="Continue"
      onPress={() => router.push('/create-account')}
      testID="profile-continue"
    />
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/create-account')}
      style={styles.skip}
    >
      <Text style={styles.skipText}>Skip for now</Text>
    </Pressable>
  </AuthLayout>;
}
const styles = StyleSheet.create({
  label: { color: authColors.navy, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  optional: { color: authColors.muted },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECEEF4',
    borderWidth: 1,
    borderColor: authColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    marginBottom: 17,
    overflow: 'hidden'
  },
  photoText: { color: authColors.muted, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 19 },
  interest: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 49,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: '#FFFFFF99'
  },
  interestText: { fontSize: 14, color: authColors.navy, flexShrink: 1 },
  selected: { backgroundColor: '#F6EDD7', borderColor: authColors.gold },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  skipText: { color: authColors.navy, fontSize: 14, textDecorationLine: 'underline' },
});
