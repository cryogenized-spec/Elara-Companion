import { assertLockboxEntry } from '../../config/lockbox';

export type ServerLockbox = {
  requiredSecret: (key: string) => string;
  optionalSecret: (key: string) => string | undefined;
  config: (key: string, fallback?: string) => string | undefined;
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
  return { requiredSecret, optionalSecret, config };
}

export const serverLockbox = createServerLockbox();
