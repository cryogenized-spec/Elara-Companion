# Voice & Chat settings architecture

The Voice & Chat settings surface has one authoritative entry point: `src/components/VoiceChatSettingsPanel.tsx`.

`SettingsModal` mounts that panel for its `voice` tab and passes the live `ElaraSettings` object through `settings` / `onChange`.

The unified panel owns three sections:

- `VoiceSettingsPanel` for voice input and transcription settings.
- `ChatEditorSettingsPanel` for chat/editor, draft recovery, and transparency settings.
- `ReliabilitySettingsPanel` for runtime reliability controls.

The child panels are implementation components of the canonical route, not alternative settings routes.

The previous `SettingsModal` compatibility bridge and one-shot migration workflow are not part of the runtime architecture. The migration workflow has been removed after Pass 10 completed.
