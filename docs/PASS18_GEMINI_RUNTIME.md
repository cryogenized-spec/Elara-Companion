# Pass 18 — Gemini Runtime Boundary

Status: complete.

This pass establishes `src/runtime/geminiRuntimeService.ts` as the application-facing boundary for direct Gemini execution.

## Canonical boundary

Higher-level application code should request Gemini execution through `streamGemini()` from the runtime service rather than importing `geminiDirectClient` directly.

## Transitional implementation

`src/lib/geminiDirectClient.ts` remains the underlying implementation for now. It already delegates model configuration, tool execution, safety settings, streaming resilience, and related execution machinery through `chatRuntime` and adjacent runtime utilities.

The physical relocation of that implementation, and removal of remaining direct consumers, is deliberately deferred to the later runtime-hardening work rather than being folded into this pass.

## Important constraint

Do not create another Gemini client or provider-specific execution path. The runtime service is a boundary, not a second implementation.

The backend `/api/chat/stream` transport still lives in the chat stream controller as transitional infrastructure. A later runtime extraction pass must move that transport behind the same runtime boundary without changing chat behaviour.
