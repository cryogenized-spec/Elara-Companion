# Google Hub UI boundary

The Google Hub shell owns navigation between Account, Services, Activity, and Permissions.

It consumes provider-neutral capability descriptors and token-free authorization snapshots. Provider API calls and capability-specific panels are supplied by the application composition layer rather than implemented here.

This keeps the shell stable while individual Google capabilities can be added, replaced, or removed independently.
