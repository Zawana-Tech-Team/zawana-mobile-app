export type RegistrationDraft = {
  email: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  interests?: string[];
  avatarUri?: string;
};
export const emptyRegistrationDraft: RegistrationDraft = { email: '', name: '', phone: '' };

/** Only these nonsecret fields may cross the registration persistence boundary. */
export function sanitizeRegistrationDraft(value: unknown): RegistrationDraft {
  if (!value || typeof value !== 'object') return { ...emptyRegistrationDraft };
  const record = value as Record<string, unknown>;
  const text = (key: string, max: number) => typeof record[key] === 'string' ? record[key].slice(0, max) : '';
  return {
    email: text('email', 254), name: text('name', 120), phone: text('phone', 32),
    ...(typeof record.dateOfBirth === 'string' ? { dateOfBirth: text('dateOfBirth', 10) } : {}),
    ...(typeof record.gender === 'string' ? { gender: text('gender', 32) } : {}),
    ...(Array.isArray(record.interests) ? {
      interests: record.interests.filter((entry): entry is string => typeof entry === 'string').slice(0, 12).map(entry => entry.slice(0, 40)),
    } : {}),
    ...(typeof record.avatarUri === 'string' && /^(file|content):\/\//.test(record.avatarUri) ? { avatarUri: text('avatarUri', 1_024) } : {}),
  };
}
