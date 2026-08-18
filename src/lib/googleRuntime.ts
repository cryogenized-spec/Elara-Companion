import { isGoogleConnected } from './googleApi';

export type GoogleRuntimeStatus = {
  connected: boolean;
  hint: string;
};

/**
 * Returns only connection state for the conversational runtime.
 * Live Google data must be retrieved by the canonical agent tool registry.
 */
export function getGoogleRuntimeStatus(): GoogleRuntimeStatus {
  const connected = isGoogleConnected();

  return {
    connected,
    hint: connected
      ? '[GOOGLE WORKSPACE]\nGoogle Workspace is connected. Use the appropriate Google/Workspace agent tools when the user requests live Google data or Google actions. Do not claim live Google data until the relevant tool reports success.'
      : '[GOOGLE WORKSPACE]\nGoogle Workspace is not connected. For requests requiring live Google data or Google actions, explain that the user needs to connect Google Workspace in Settings before the agent can access it.',
  };
}
