# Pass 16 — Legacy Google Removal

This pass removes the legacy Google Workspace UI from Settings. The canonical user-facing Google surface is Google Hub.

## Legacy function classification

| Legacy path/function | Classification | Disposition |
|---|---|---|
| Google authorization/connect in Settings | migrate | Google Hub authorization flow |
| Calendar sync in Settings | migrate | Google Hub Calendar capability |
| Tasks sync in Settings | migrate | Google Hub Tasks capability |
| Docs export/browse/update in Settings | migrate | Google Hub Docs/Drive capabilities |
| Sheets creation in Settings | migrate | Google Hub Sheets capability |
| Contacts sync in Settings | migrate | Google Hub Contacts capability |
| Gmail sync/draft/send in Settings | migrate | Google Hub Gmail capability |
| Chat spaces/messages/cards/webhooks in Settings | migrate | Google Hub Chat capability |
| Local Keep/reference archive controls | retain because unrelated to Google | canonical local Reference Archive |
| Persona, visuals, voice, system, and data Settings | retain because unrelated to Google | direct canonical SettingsModal |
| LegacySettingsModal | delete | replaced by direct SettingsModal |
| settingsGoogleService | delete | Settings-only Google adapter removed |
| settingsCalendarService | delete | Settings-only Calendar adapter removed |
| googleCalendarLegacyInventory.test.ts | delete | obsolete legacy-surface inventory |

## Acceptance

There is no user-facing Workspace tab or legacy Google Settings route. Settings contains only application-owned non-Google configuration, while Google operations are surfaced through Google Hub. Repository architecture tests enforce the absence of the deleted legacy Settings Google component and adapters.
