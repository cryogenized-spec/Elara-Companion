const DEFAULT_GOOGLE_CLIENT_ID = '988991302383-rj8vah445mk9r991k10pc4knk2omk2p4.apps.googleusercontent.com';

export function getConfiguredGoogleClientId(): string {
  return (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
}
