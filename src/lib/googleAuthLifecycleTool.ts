import { getAccessToken } from './googleApi';
import { revokeGoogleAccessToken } from './googleAuthLifecycle';
export const GOOGLE_AUTH_LIFECYCLE_TOOL_DECLARATION = { name: 'disconnect_google_workspace', description: 'Revoke the current Google Workspace access token and disconnect Google Workspace. This is a destructive authentication action and requires explicit user confirmation.', parameters: { type: 'OBJECT', properties: { userConfirmed: { type: 'BOOLEAN', description: 'Must be true only when the user explicitly asked to disconnect/revoke Google Workspace access.' } }, required: ['userConfirmed'] } };
export async function executeGoogleAuthLifecycleTool(toolName: string, args: any): Promise<any> {
  if (toolName !== 'disconnect_google_workspace') return { success: false, provider: 'google_auth', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown Google authentication lifecycle tool: ${toolName}` };
  if (args?.userConfirmed !== true) return { success: false, provider: 'google_auth', errorCode: 'GOOGLE_ACTION_CONFIRMATION_REQUIRED', message: 'Explicit user confirmation is required before disconnecting Google Workspace.' };
  return { provider: 'google_auth', operation: 'disconnect', ...(await revokeGoogleAccessToken(getAccessToken())) };
}
