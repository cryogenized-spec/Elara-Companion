export type GoogleAskHandler = (prompt: string) => void;

let handler: GoogleAskHandler | null = null;

export function setGoogleAskHandler(next: GoogleAskHandler | null): void {
  handler = next;
}

export function requestGoogleAsk(prompt: string): void {
  if (handler) {
    handler(prompt);
    return;
  }
  console.warn('Google Hub Ask Elara requested before the chat handler was ready.');
}
