export type GoogleActionClass = 'read' | 'write' | 'destructive';

export type GoogleAuthorizationDecision =
  | { allowed: true }
  | { allowed: false; errorCode: 'GOOGLE_AUTH_REQUIRED' | 'GOOGLE_ACTION_CONFIRMATION_REQUIRED'; message: string; requiresUserAuth?: boolean };

const destructiveTools = new Set([
  'delete_google_keep_note',
]);

const writeTools = new Set([
  'create_google_sheet',
  'write_google_sheet_range',
  'append_google_sheet_row',
  'batch_update_google_sheet',
  'create_google_keep_note',
  'create_calendar_event',
  'create_google_doc',
  'update_google_doc',
  'sync_to_google_doc',
  'sync_from_google_doc',
]);

export function classifyGoogleAction(toolName: string): GoogleActionClass {
  if (destructiveTools.has(toolName)) return 'destructive';
  if (writeTools.has(toolName)) return 'write';
  return 'read';
}

export function authorizeGoogleAction(
  toolName: string,
  args: unknown,
  accessToken?: string,
): GoogleAuthorizationDecision {
  if (!accessToken?.trim()) {
    return {
      allowed: false,
      errorCode: 'GOOGLE_AUTH_REQUIRED',
      message: 'Google authorization is required before this tool can run.',
      requiresUserAuth: true,
    };
  }

  const actionClass = classifyGoogleAction(toolName);
  const safeArgs = args && typeof args === 'object' ? args as Record<string, unknown> : {};

  if ((actionClass === 'write' || actionClass === 'destructive') && safeArgs.userConfirmed !== true) {
    return {
      allowed: false,
      errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED',
      message: 'This Google operation changes external data. Explicit user confirmation is required before it can run.',
    };
  }

  return { allowed: true };
}
