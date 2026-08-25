/**
 * Temporary compatibility bridge for the legacy chat controller.
 *
 * The controller currently references generateUniqueId without importing its helper.
 * Keep this global shim isolated so the later chat-runtime extraction can remove it
 * without changing application behaviour elsewhere.
 */
function createUniqueId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

declare global {
  // eslint-disable-next-line no-var
  var generateUniqueId: (prefix: string) => string;
}

if (typeof globalThis.generateUniqueId !== 'function') {
  globalThis.generateUniqueId = createUniqueId;
}

export {};