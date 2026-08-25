import { clearDbStorage } from '../lib/db';

/**
 * Application-level persistence operations that must remain behind the
 * persistence boundary. The underlying IndexedDB implementation stays in
 * infrastructure for now.
 */
export async function clearApplicationPersistence(): Promise<void> {
  await clearDbStorage();
}
