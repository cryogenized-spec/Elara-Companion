export type GoogleIntent =
  | 'calendar'
  | 'tasks'
  | 'gmail'
  | 'contacts'
  | 'keep'
  | 'docs'
  | 'sync'
  | null;

/**
 * Lightweight intent hints retained for UI/status messaging only.
 * Actual Google data retrieval and actions are delegated to the agent tool layer.
 */
export function detectGoogleIntent(message: string): GoogleIntent {
  const text = message.toLowerCase();
  if (/(calendar|schedule|agenda|upcoming event|meeting|appointment)/i.test(text)) return 'calendar';
  if (/(task|todo|to-do|action item|checklist)/i.test(text)) return 'tasks';
  if (/(email|gmail|inbox|unread|messages|check my mail|send an email|draft an email)/i.test(text)) return 'gmail';
  if (/(contact|email address|phone number|look up|who is|find contact)/i.test(text)) return 'contacts';
  if (/(keep note|archive note|reference quote|archived quote|saved note|save to keep|take a note|save note)/i.test(text)) return 'keep';
  if (/(google doc|google docs|drive doc|document|read doc|search docs|edit doc|append to doc|update doc|create doc|draft doc)/i.test(text)) return 'docs';
  if (/(sync|refresh|fetch|check|pull)/i.test(text)) return 'sync';
  return null;
}

export function buildGoogleConnectionHint(intent: GoogleIntent, connected: boolean): string {
  if (!intent) return '';
  if (connected) {
    return `[GOOGLE WORKSPACE]\nGoogle Workspace is connected. Use the appropriate Google/Workspace agent tools when the user's request requires live Google data or an external Google action. Do not claim live data until the relevant tool reports success.`;
  }
  return `[GOOGLE WORKSPACE]\nGoogle Workspace is not connected. For requests that require live Google data or Google actions, explain that the user needs to connect Google Workspace in Settings before the agent can access it.`;
}
