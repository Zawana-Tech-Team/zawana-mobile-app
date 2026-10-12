import { inMemoryPersistence } from 'firebase/auth';

/** Browser/server builds deliberately keep authentication material in memory. */
export function getIdentityPersistence() {
  return { persistent: inMemoryPersistence, ephemeral: inMemoryPersistence };
}
