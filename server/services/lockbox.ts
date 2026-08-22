import { assertLockboxEntry } from '../../config/lockbox';

export type ServerLockbox = {
  requiredSecret: (key: string) => string;
  optionalSecret: (key: string) => string | undefined;
  config: (key: string, fallback?: string) => string | undefined;
};

function readEnv(key: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[key] : undefined;
}

export function createServerLockbox(env: NodeJS.ProcessEnv = process.env): ServerLockbox {
  const requiredSecret = (key: string): string => {
    assertLockboxEntry(key, { exposure: 'server' });
    const value = env[key];
    if (!value?.trim()) throw new Error(`Required Lockbox secret ${key} is not configured.`);
    return value;
  };

  const optionalSecret = (key: string): string | undefined => {
    assertLockboxEntry(key, { exposure: 'server' });
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
export const readServerEnv = readEnv;
