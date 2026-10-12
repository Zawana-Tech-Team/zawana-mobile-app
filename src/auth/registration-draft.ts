import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { ephemeralStorage, secureDeviceStorage } from './storage';
import { emptyRegistrationDraft, sanitizeRegistrationDraft, type RegistrationDraft } from './draft-core';

export { sanitizeRegistrationDraft, type RegistrationDraft } from './draft-core';
const DRAFT_KEY = 'registration-draft-v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1_000;
const emptyDraft = emptyRegistrationDraft;
const storage = () => Platform.OS === 'web' ? ephemeralStorage : secureDeviceStorage;
type DraftSnapshot = { draft: RegistrationDraft; loaded: boolean; storageError: boolean };
const initialSnapshot: DraftSnapshot = { draft: { ...emptyDraft }, loaded: false, storageError: false };
let snapshot = initialSnapshot;
let generation = 0;
let initialization: Promise<void> | null = null;
const subscribers = new Set<() => void>();
const publish = (next: DraftSnapshot) => { snapshot = next; subscribers.forEach(subscriber => subscriber()); };
const subscribe = (subscriber: () => void) => { subscribers.add(subscriber); return () => { subscribers.delete(subscriber); }; };

function initializeDraft() {
  if (initialization) return initialization;
  const attempt = generation;
  initialization = readRegistrationDraft().then(draft => {
    if (attempt === generation) publish({ draft, loaded: true, storageError: false });
    else publish({ ...snapshot, loaded: true });
  }).catch(() => { publish({ ...snapshot, loaded: true, storageError: true }); });
  return initialization;
}

export async function readRegistrationDraft(): Promise<RegistrationDraft> {
  const raw = await storage().getItem(DRAFT_KEY);
  if (!raw) return { ...emptyDraft };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('updatedAt' in parsed) || typeof parsed.updatedAt !== 'number'
      || !('draft' in parsed) || Date.now() - parsed.updatedAt > MAX_AGE || parsed.updatedAt > Date.now() + 60_000) {
      await clearRegistrationDraft();
      return { ...emptyDraft };
    }
    return sanitizeRegistrationDraft(parsed.draft);
  } catch {
    await clearRegistrationDraft();
    return { ...emptyDraft };
  }
}

export async function saveRegistrationDraft(draft: RegistrationDraft): Promise<void> {
  await storage().setItem(DRAFT_KEY, JSON.stringify({ updatedAt: Date.now(), draft: sanitizeRegistrationDraft(draft) }));
}

export async function clearRegistrationDraft(): Promise<void> {
  generation++;
  publish({ draft: { ...emptyDraft }, loaded: true, storageError: false });
  await storage().removeItem(DRAFT_KEY);
}

export function useRegistrationDraft() {
  const current = useSyncExternalStore(subscribe, () => snapshot, () => initialSnapshot);
  useEffect(() => { void initializeDraft(); }, []);

  return {
    ...current,
    update(patch: Partial<RegistrationDraft>) {
      generation++;
      const draft = sanitizeRegistrationDraft({ ...snapshot.draft, ...patch });
      publish({ ...snapshot, draft });
      void saveRegistrationDraft(draft).catch(() => { publish({ ...snapshot, storageError: true }); });
    },
    clear: clearRegistrationDraft,
  };
}
