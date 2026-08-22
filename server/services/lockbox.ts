import { assertLockboxEntry, LOCKBOX_MANIFEST } from '../../config/lockbox';

export type ServerLockbox = {
  requiredSecret: (key: string) => string;
  optionalSecret: (key: string) => string | undefined;
  config: (key: string, fallback?: string) => string | undefined;
  diagnostics: () => Array<{ key: string; configured: boolean; classification: string; exposures: readonly string[] }>;
};

export function createServerLockbox(env: NodeJS.ProcessEnv = process.env): ServerLockbox {
  const assertServer = (key: string) => assertLockboxEntry(key, { exposures: ['server'] as const });
  const requiredSecret = (key: string): string => {
    assertServer(key);
    const value = env[key];
    if (!value?.trim()) throw new Error(`Required Lockbox secret ${key} is not configured.`);
    return value;
  };
  const optionalSecret = (key: string): string | undefined => {
    assertServer(key);
    const value = env[key];
    return value?.trim() ? value : undefined;
  };
  const config = (key: string, fallback?: string): string | undefined => {
    assertLockboxEntry(key);
    return env[key]?.trim() || fallback;
  };
  const diagnostics = () => LOCKBOX_MANIFEST
    .filter((entry) => entry.exposures.includes('server'))
    .map((entry) => ({
      key: entry.key,
      configured: Boolean(env[entry.key]?.trim()),
      classification: entry.classification,
      exposures: entry.exposures,
    }));
  return { requiredSecret, optionalSecret, config, diagnostics };
}

export const serverLockbox = createServerLockbox();
