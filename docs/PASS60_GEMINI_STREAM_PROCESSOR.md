# Pass 60 — Gemini Stream Processor

The raw Gemini response-stream handling has been extracted from `resilientGeminiStream.ts` into `geminiStreamProcessor.ts`.

The processor owns chunk batching, thought/text/function-call extraction, abort behavior, and post-output stream-failure classification. The resilience layer now owns model selection, fallback/probing state, and resilience-status reporting.

Focused tests cover text/thought emission, function-call flushing, pre-aborted streams, and post-output failure classification.
