# Google Hub Pass 21 — Chat Model Selector

## Objective

Expose the selected model directly in the chat composer, immediately to the left of the existing M↓ control, using the canonical Pass 20 model-preference state.

## Delivered

- Added `ChatModelSelector` as a dedicated chat-composer control.
- Reused the existing `ComposerMarkdownAnchor` portal host so the selector sits in the same toolbar row as M↓ without rewriting the legacy composer implementation.
- Selector displays the currently selected friendly model name.
- Menu opens upward with `bottom-full` positioning and viewport-aware width.
- Menu provides keyboard Escape dismissal and outside-click dismissal.
- Selection is persisted through the existing IndexedDB settings store via `getDbSettings` / `setDbSettings`.
- Selection updates `settings.model` and moves the selected model to the front of `preferredModelOrder` while leaving `fallbackModels` untouched.
- Application state subscribes to a single `elara-settings-changed` event so runtime execution state updates immediately without introducing a second settings store.
- Unavailable configured entries remain visible and are presented as disabled rather than silently disappearing.
- Added Pass 21 acceptance tests and this durable completion note.

## Acceptance matrix

- Selector physically present in composer: COMPLETE — source-verified through `ComposerMarkdownAnchor`.
- Selector left of M↓: COMPLETE — source test asserts render order.
- Upward menu: COMPLETE — source-verified via `bottom-full` positioning.
- Current model visible closed: COMPLETE — source-verified.
- Selection changes actual application model state: COMPLETE — persisted `settings.model` event reaches application state controller.
- Selection persists after reload: COMPLETE — uses canonical `setDbSettings` / `getDbSettings`.
- Keyboard interaction: COMPLETE — Escape closes the menu; native button focus remains available.
- Mobile/responsive width: COMPLETE — selector uses bounded responsive width and the menu uses `min(18rem, calc(100vw - 2rem))`.
- No duplicate settings store: COMPLETE — existing IndexedDB settings store remains canonical.
- Fallback policy untouched by selection: COMPLETE — selector does not modify `fallbackModels`.

## Verification boundary

The repository CI suite must provide execution-level TypeScript/lint/test/build verification before merge. Browser visual inspection remains part of the existing live UI proving process, particularly the final mobile/desktop placement relative to M↓.
