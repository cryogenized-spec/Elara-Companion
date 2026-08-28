# Stage 2 — Google Hub Pass 6: Calendar + Tasks

Status: COMPLETE
Branch: `feature/google-hub-pass6`

Pass 6 completes the action-oriented Calendar/Tasks slice on top of the Pass 5 provider modules.

Completed:

- Calendar capability panel remains provider-backed through the existing Calendar service.
- Google Tasks capability panel supports refresh, creation, and completion-safe provider separation.
- Added `completeTask()` to `googleTasksService.ts`; UI code does not own OAuth/token handling.
- Capability availability continues to come from the Google Hub authorization projection.
- Activity hooks remain available for Calendar/Tasks operations.

Invariant:

A Hub capability is enabled only when every declared required capability is granted. Do not revert to `some()` semantics.

Next: Pass 7 — Drive / Docs / Sheets rich capability surfaces.
