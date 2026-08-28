import type { GoogleActivityEvent, GoogleActivityRecorder } from '../contracts/googleActivity';

const MAX_EVENTS = 200;

export function createGoogleActivityRecorder(): GoogleActivityRecorder {
  const events: GoogleActivityEvent[] = [];
  return {
    record(event) {
      events.unshift({ ...event });
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    },
    list(limit = 50) {
      return events.slice(0, Math.max(0, limit)).map(event => ({ ...event }));
    },
    clear() {
      events.length = 0;
    },
  };
}

export const googleActivityRecorder = createGoogleActivityRecorder();
