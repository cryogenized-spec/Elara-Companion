# Gemini Interactions safety boundary

The application keeps `ELARA_SAFETY_SETTINGS` with `BLOCK_NONE` for Gemini API paths that support request-level safety settings, including the GenerateContent-based conversation-title path.

The stateful Gemini Interactions API is different: custom safety settings are not supported there. The Interactions adapter therefore does not serialize `safety_settings` into interaction requests. It retains explicit creative/artistic/fictional roleplay framing as system instruction, but that framing is contextual rather than a mechanism for disabling provider safety behavior.

The production Chat runtime must preserve the requested model ID exactly. In particular, `gemini-3.7-flash` must never be silently rewritten to `gemini-3.6-flash`.
