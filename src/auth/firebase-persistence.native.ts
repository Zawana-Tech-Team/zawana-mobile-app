import * as FirebaseAuth from 'firebase/auth';

import { AuthError } from './errors';
import { secureDeviceStorage, type StorageDriver } from './storage';

/** Metro resolves this file only for iOS/Android, including Firebase's RN export. */
export function getIdentityPersistence() {
  const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: (storage: StorageDriver) => FirebaseAuth.Persistence;
  };
  if (!nativeAuth.getReactNativePersistence) {
    throw new AuthError(
      'configuration',
      'The Firebase native persistence module is unavailable. Rebuild the app with the installed dependencies.'
    );
  }
  return {
    persistent: nativeAuth.getReactNativePersistence(secureDeviceStorage),
    ephemeral: FirebaseAuth.inMemoryPersistence,
  };
}
