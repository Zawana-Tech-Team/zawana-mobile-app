/** AsyncStorage-shaped interface, backed by Keychain/Keystore on devices. */
export type StorageDriver = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type Manifest = { version: 1; generation: string; count: number };
const MAX_PARTS = 128;
const PART_CHARACTERS = 400; // At most 1,600 UTF-8 bytes, including four-byte characters.

function manifest(value: string | null): Manifest | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || !parsed || !('version' in parsed) || parsed.version !== 1
      || !('generation' in parsed) || typeof parsed.generation !== 'string' || !/^[a-z0-9]+$/.test(parsed.generation)
      || !('count' in parsed) || typeof parsed.count !== 'number' || !Number.isInteger(parsed.count)
      || parsed.count < 1 || parsed.count > MAX_PARTS) return null;
    return parsed as Manifest;
  } catch { return null; }
}

/**
 * Firebase serializes refresh tokens with user JSON. Chunk encrypted storage so
 * older iOS Keychain value limits do not silently disable session persistence.
 * Publish the manifest last, preserving the previous value on a failed write.
 */
export function createChunkedStorage(driver: StorageDriver): StorageDriver {
  const queues = new Map<string, Promise<unknown>>();
  let counter = 0;
  const keyFor = (key: string) => `zawana.${Array.from(key).map(char => char.codePointAt(0)!.toString(16)).join('.')}`;
  const partFor = (key: string, value: Manifest, index: number) => `${key}.${value.generation}.${index}`;
  const removeParts = async (key: string, value: Manifest | null) => {
    if (value) await Promise.all(Array.from({ length: value.count }, (_, index) => driver.removeItem(partFor(key, value, index))));
  };
  function queue<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(action);
    queues.set(key, current);
    void current.finally(() => { if (queues.get(key) === current) queues.delete(key); }).catch(() => undefined);
    return current;
  }
  return {
    getItem: key => queue(key, async () => {
      const storageKey = keyFor(key);
      const current = manifest(await driver.getItem(storageKey));
      if (!current) return null;
      const parts = await Promise.all(Array.from({ length: current.count }, (_, index) => driver.getItem(partFor(storageKey, current, index))));
      if (parts.some(part => part === null)) {
        await driver.removeItem(storageKey);
        await removeParts(storageKey, current);
        return null; // Never restore truncated credentials.
      }
      return parts.join('');
    }),
    setItem: (key, value) => queue(key, async () => {
      const storageKey = keyFor(key);
      const previous = manifest(await driver.getItem(storageKey));
      const characters = Array.from(value);
      const count = Math.max(1, Math.ceil(characters.length / PART_CHARACTERS));
      if (count > MAX_PARTS) throw new Error('The secure storage value is too large.');
      const next: Manifest = { version: 1, generation: `${Date.now().toString(36)}${(counter++).toString(36)}`, count };
      try {
        for (let index = 0; index < count; index++) {
          await driver.setItem(partFor(storageKey, next, index), characters.slice(index * PART_CHARACTERS, (index + 1) * PART_CHARACTERS).join(''));
        }
        await driver.setItem(storageKey, JSON.stringify(next));
      } catch (error) {
        await removeParts(storageKey, next).catch(() => undefined);
        throw error;
      }
      // Cleanup failure does not invalidate the newly committed value.
      await removeParts(storageKey, previous).catch(() => undefined);
    }),
    removeItem: key => queue(key, async () => {
      const storageKey = keyFor(key);
      const current = manifest(await driver.getItem(storageKey));
      await driver.removeItem(storageKey); // Remove the restoration pointer first.
      await removeParts(storageKey, current);
    }),
  };
}

export function createMemoryStorage(): StorageDriver {
  const values = new Map<string, string>();
  return {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
}

const deviceDriver: StorageDriver = {
  async getItem(key) {
    const secureStore = await import('expo-secure-store');
    return secureStore.getItemAsync(key, { keychainService: 'zawana.auth' });
  },
  async setItem(key, value) {
    const secureStore = await import('expo-secure-store');
    await secureStore.setItemAsync(key, value, {
      keychainService: 'zawana.auth', keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(key) {
    const secureStore = await import('expo-secure-store');
    await secureStore.deleteItemAsync(key, { keychainService: 'zawana.auth' });
  },
};

export const secureDeviceStorage = createChunkedStorage(deviceDriver);
export const ephemeralStorage = createMemoryStorage();
