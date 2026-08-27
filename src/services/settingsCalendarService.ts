import { googleCalendarContract } from '../contracts/implementations';

export const getUpcomingCalendarEvents = (maxResults?: number) =>
  googleCalendarContract.getUpcoming(maxResults);
