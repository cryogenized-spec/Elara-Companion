export type GoogleActionClass = 'read' | 'write' | 'destructive';

export type GoogleAuthorizationDecision =
  | { allowed: true }
  | { allowed: false; errorCode: 'GOOGLE_AUTH_REQUIRED' | 'GOOGLE_ACTION_CONFIRMATION_REQUIRED'; message: string; requiresUserAuth?: boolean };

export function classifyGoogleAction(toolName: string): GoogleActionClass {
  const destructive = new Set([
    'delete_google_keep_note',
    'disconnect_google_workspace',
  ]);
  const writes = new Set([
    'create_google_sheet',
    'write_google_sheet_range',
    'append_google_sheet_row',
    'batch_update_google_sheet',
    'create_google_keep_note',
    'create_calendar_event',
  ]);

  if (destructive.has(toolName)) return 'destructive';
  if (writes.has(toolName)) return 'write';
  return 'read';
}

export function authorizeGoogleAction(
  toolName: string,
  args: unknown,
  accessToken?: string,
): GoogleAuthorizationDecision {
  if (!accessToken?.trim() && toolName !== 'disconnect_google_workspace') {
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
      message: 'This Google operation changes external data or authentication state. Explicit user confirmation is required before it can run.',
    };
  }

  return { allowed: true };
}
