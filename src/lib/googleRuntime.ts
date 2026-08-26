import { googleIdentity } from '../services/googleWorkspaceService';
import { isGoogleAuthInvalidated } from './googleAuthLifecycle';
export type GoogleRuntimeStatus = { connected: boolean; hint: string };
export function getGoogleRuntimeStatus(): GoogleRuntimeStatus {
  const connected = googleIdentity.isAuthorized() && !isGoogleAuthInvalidated();
  return { connected, hint: connected ? '[GOOGLE WORKSPACE]\nGoogle Workspace is connected. Use the appropriate Google/Workspace agent tools when the user requests live Google data or Google actions. Do not claim live Google data until the relevant tool reports success.' : '[GOOGLE WORKSPACE]\nGoogle Workspace is not connected or the current Google session has been invalidated. For requests requiring live Google data or Google actions, explain that the user needs to reconnect Google Workspace in Settings before the agent can access it.' };
}
