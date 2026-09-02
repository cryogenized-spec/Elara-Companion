# Gemini content-safety root cause

The application uses `BLOCK_NONE` for the four configurable Gemini safety categories supported by the Gemini API: harassment, hate speech, sexually explicit content, and dangerous content.

`HARM_CATEGORY_JAILBREAK` is intentionally not included in `ELARA_SAFETY_SETTINGS`. The SDK exposes the enum, but the Gemini API documentation marks that enum as unsupported for Gemini API safety settings. Jailbreak detection can still exist as provider-side protection; it is not a configurable switch in this API path.

Elara's persona and roleplay instructions must consistently describe the interaction as fictional, creative, artistic roleplay. They must not simultaneously tell the model that the fictional character is real or that the roleplay exists in shared physical reality, because contradictory framing can resemble an attempt to manipulate instruction hierarchy or safety classification.
