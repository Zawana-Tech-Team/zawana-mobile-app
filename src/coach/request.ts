import type { StorageDriver } from '../auth/storage.ts';
import { AuthError } from '../auth/errors.ts';
export type SavedRequest<T> = { requestKey: string; input: T };
export function readSavedRequest<T>(raw: string): SavedRequest<T> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('requestKey' in value) || typeof value.requestKey !== 'string' || !value.requestKey || !('input' in value) || !value.input || typeof value.input !== 'object' || Array.isArray(value.input)) throw new AuthError('invalidResponse','Could not restore the saved request. Refresh before continuing.');
  return value as SavedRequest<T>;
}
export async function persistRequest<T>(storage: StorageDriver, key: string, input: T, createKey: () => string): Promise<SavedRequest<T>> {
  const raw = await storage.getItem(key);
  if (raw) {
    const previous = readSavedRequest<T>(raw);
    if (!previous.requestKey || JSON.stringify(previous.input) !== JSON.stringify(input)) throw new AuthError('bookingConflict','A saved request must be resolved before starting a different one.');
    return previous;
  }
  const value = { requestKey: createKey(), input: JSON.parse(JSON.stringify(input)) as T };
  await storage.setItem(key,JSON.stringify(value));
  return value;
}
