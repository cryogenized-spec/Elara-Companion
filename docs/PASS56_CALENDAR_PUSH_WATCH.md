# Calendar Pass 5 — Push/Watch Notifications and Agent Exposure

Calendar Pass 5 adds Google Calendar push-channel lifecycle management and exposes the synchronization/watch operations through the canonical agent tool surface.

## Push channel architecture

`src/infrastructure/googleCalendarWatchApi.ts` owns the direct Google Calendar watch transport. The application service `src/services/googleCalendarService.ts` owns authorization and delegates to that adapter, preserving the feature boundary used by the rest of Calendar.

A watch request creates a `web_hook` channel for one calendar. The webhook address must be HTTPS. Channel metadata and the verification token are stored in the existing Google Vault KV namespace by `background-runtime/googleCalendarPush.ts`.

The public webhook endpoint is:

`POST /google/calendar/notifications`

Google notifications are header-only change signals. The receiver validates the channel ID, resource ID, channel token, and resource state before storing a bounded change signal. It never accepts an OAuth credential or trusts an unauthenticated channel identifier by itself.

Channel status and the latest change signal are exposed only behind the existing background-runtime authorization token:

- `GET /google/calendar/watch/:channelId`
- `GET /google/calendar/changes/:calendarId`
- `POST /google/calendar/watch`
- `POST /google/calendar/watch/stop`

Channel tokens are deliberately omitted from channel-status responses after retrieval from KV.

## Sync remains authoritative

A push notification does not contain the changed Calendar event. The notification path therefore never attempts to reconstruct event state from the webhook request. The durable client-side Calendar synchronization service remains authoritative and consumes the existing `syncToken` state from Calendar Pass 4.

This also makes the system resilient to duplicate, delayed, or missed notifications: a change signal is an optimization that tells a consumer that synchronization is worth performing, not a replacement for synchronization itself.

## Agent exposure

The canonical Google operational agent surface now exposes:

- `sync_google_calendar` — read-only incremental synchronization using the local sync state.
- `watch_google_calendar` — creates a push subscription and requires explicit user confirmation.
- `stop_google_calendar_watch` — removes a push subscription and requires explicit user confirmation.

The agent tools contain no direct Calendar REST implementation. They route through `googleCalendarService`, and the shared Google authorization policy classifies watch lifecycle operations as external writes requiring explicit confirmation.

## Renewal and shutdown

Google push channels have finite lifetimes and must be renewed explicitly. Renewal is implemented as a new watch channel; shutdown uses the shared `channels.stop` endpoint and removes the corresponding local channel record.

Pass 5 intentionally does not add user-facing Calendar watch controls or automatic browser-side sync orchestration. Those remain higher-level workflow concerns for the following Calendar pass.
