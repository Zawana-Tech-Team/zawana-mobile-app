import { GetStartedScreen } from '@/components/auth/get-started-screen';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';
import { sessionNavigation } from '@/auth/navigation-policy';
import { AuthErrorMessage, AuthLayout, PrimaryButton, SecondaryButton } from '@/components/auth/ui';
import { useFormTask } from '@/hooks/use-form-task';
import { getFirebaseAuth } from '@/auth/firebase';
import { useRegistrationDraft } from '@/auth/registration-draft';

export default function Index() {
  const auth = useAuth();
  const policy = sessionNavigation(auth);
  const task = useFormTask();
  const registration = useRegistrationDraft();
  if (policy.restoring) return null;
  if (policy.landing !== '/') return <Redirect href={policy.landing} />;
  if (auth.phoneChallenge) return <Redirect href="/verify" />;
  // A failed restoration must never present an authenticated Home or hide the failure.
  if (auth.status === 'error' && auth.identity) return (
    <AuthLayout title="Unable to restore your session" testID="session-error">
      <AuthErrorMessage message={task.error ?? auth.error} />
      <PrimaryButton label="Try again" loading={task.loading} onPress={() => task.run(async () => { await auth.retryRestore(); })} />
      <SecondaryButton label="Sign out" onPress={() => task.run(auth.signOut)} />
    </AuthLayout>
  );
  return <GetStartedScreen busy={auth.busy || task.loading} appleAvailable={auth.appleAvailable}
    error={auth.errorCode === 'cancelled' ? null : task.error ?? (auth.status === 'error' ? auth.error : null)} onAction={action => {
    if (action === 'phone') router.push('/sign-in');
    if (action === 'signup') router.push('/sign-up');
    if (action === 'google' || action === 'apple') void task.run(async () => {
      const status = await (action === 'google' ? auth.signInGoogle() : auth.signInApple());
      const identity = getFirebaseAuth().currentUser;
      if (identity && status === 'profile-required') {
        registration.update({ ...(identity.email ? { email: identity.email } : {}),
          ...(identity.displayName ? { name: identity.displayName } : {}),
          ...(identity.phoneNumber ? { phone: identity.phoneNumber } : {}) });
        router.replace('/create-account');
      }
      if (status === 'verification-required') router.replace('/verify');
      if (status === 'error') throw new Error('Firebase signed you in, but ZAWANA could not validate the member session. Please retry.');
    });
  }} />;
}
