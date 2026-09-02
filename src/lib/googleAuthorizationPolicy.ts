export type GoogleActionClass = 'read' | 'write' | 'destructive';

export type GoogleAuthorizationDecision =
  | { allowed: true }
  | { allowed: false; errorCode: 'GOOGLE_AUTH_REQUIRED' | 'GOOGLE_ACTION_CONFIRMATION_REQUIRED'; message: string; requiresUserAuth?: boolean };

const DESTRUCTIVE_TOOLS = new Set(['disconnect_google_workspace']);
const WRITE_TOOLS = new Set(['complete_google_task', 'move_google_task', 'watch_google_calendar', 'stop_google_calendar_watch']);
const WRITE_PREFIXES = ['create_', 'update_', 'write_', 'append_', 'batch_update_', 'send_', 'post_', 'sync_to_', 'sync_from_'];
const DESTRUCTIVE_PREFIXES = ['delete_'];

export function classifyGoogleAction(toolName: string): GoogleActionClass {
  if (DESTRUCTIVE_TOOLS.has(toolName) || DESTRUCTIVE_PREFIXES.some((prefix) => toolName.startsWith(prefix))) return 'destructive';
  if (WRITE_TOOLS.has(toolName) || WRITE_PREFIXES.some((prefix) => toolName.startsWith(prefix))) return 'write';
  return 'read';
}

export function authorizeGoogleAction(toolName: string, args: unknown, accessToken?: string): GoogleAuthorizationDecision {
  if (!accessToken?.trim() && toolName !== 'disconnect_google_workspace') {
    return { allowed: false, errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before this tool can run.', requiresUserAuth: true };
  }

  const actionClass = classifyGoogleAction(toolName);
  const safeArgs = args && typeof args === 'object' ? args as Record<string, unknown> : {};

  if ((actionClass === 'write' || actionClass === 'destructive') && safeArgs.userConfirmed !== true) {
    return { allowed: false, errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'This Google operation changes external data or authentication state. Explicit user confirmation is required before it can run.' };
  }

  return { allowed: true };
}
