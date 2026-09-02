# Calendar Pass 3 — Discovery, Free/Busy, and Recurrence Semantics

This pass extends the canonical Calendar service without introducing synchronization or agent exposure changes.

Calendar discovery is implemented through CalendarList with pagination and normalized metadata. Free/Busy is implemented through `freeBusy.query` with bounded multi-calendar requests and per-calendar errors. Event normalization now preserves recurrence-aware fields, and recurring series instances are available through the paginated `events.instances` endpoint. Event creation accepts recurrence rules and explicit time zones, while event operations accept an optional calendar identifier and retain `primary` as the default.

Least-privilege capabilities are used for discovery and availability: `calendar.list` uses `calendar.calendarlist.readonly`, and `calendar.freebusy` uses `calendar.freebusy`.

Explicitly deferred to later passes: `syncToken`, local synchronization state, push/watch notifications, agent/tool exposure, and user-facing Calendar workflow changes.

The pass includes regression coverage for discovery pagination, Free/Busy request construction and validation, recurring-instance pagination and identity, recurrence-rule creation, and the new authorization capabilities.
