export type FirebaseIdentity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  displayName: string | null;
  getIdToken(forceRefresh?: boolean): Promise<string>;
};

export function hasVerifiedIdentity(identity: { emailVerified: boolean; phoneNumber?: string | null }) {
  return identity.emailVerified || Boolean(identity.phoneNumber && /^\+[1-9]\d{6,14}$/.test(identity.phoneNumber));
}
