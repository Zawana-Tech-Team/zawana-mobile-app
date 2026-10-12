import type { SessionState } from './session-controller.ts';
import { hasVerifiedIdentity } from './identity.ts';

/** Route access requires both a verified identity and the canonical backend user. */
export function sessionNavigation(state: Pick<SessionState, 'status' | 'identity' | 'user'>) {
  const member = state.status === 'authenticated' && Boolean(state.identity && hasVerifiedIdentity(state.identity) && state.user);
  return {
    member,
    authentication: !member,
    restoring: state.status === 'loading',
    landing: member ? '/home' : state.status === 'verification-required' ? '/verify'
      : state.status === 'profile-required' ? '/create-account' : '/',
  } as const;
}
