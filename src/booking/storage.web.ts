import type { StorageDriver } from '../auth/storage';

// Pending selections contain no authentication credentials. Persist only in this browser tab.
// Auth continues to use its existing ephemeral web session policy.
export const bookingStorage: StorageDriver = {
  async getItem(key) { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key); },
  async setItem(key, value) { window.sessionStorage.setItem(key, value); },
  async removeItem(key) { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); },
};
