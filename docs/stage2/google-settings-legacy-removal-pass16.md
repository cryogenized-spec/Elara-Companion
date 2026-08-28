# Pass 16 — Legacy Google Removal

This branch removes the legacy Google Workspace UI from Settings. The canonical user-facing Google surface is Google Hub.

The old Settings Google functions are classified as follows:

| Legacy function / path | Classification | Replacement / disposition |
|---|---|---|
| Google authorization/connect | migrate | Google Hub authorization flow |
| Calendar sync | migrate | Google Hub Calendar capability |
| Tasks sync | migrate | Google Hub Tasks capability |
| Docs export / browse / update | migrate | Google Hub Docs/Drive capabilities |
| Sheets create | migrate | Google Hub Sheets capability |
| Contacts sync | migrate | Google Hub Contacts capability |
| Gmail sync / draft / send | migrate | Google Hub Gmail capability |
| Chat spaces/messages/cards/webhooks | migrate | Google Hub Chat capability |
| Keep archive controls | retain because unrelated to Google | canonical local Reference Archive |
| Persona / visuals / voice / system / data Settings | retain because unrelated to Google | retained in canonical SettingsModal |
| LegacySettingsModal wrapper | delete | replaced by direct canonical SettingsModal |
| settingsGoogleService | delete | no Settings consumer remains; Google Hub owns Google services |
| settingsCalendarService | delete | no Settings consumer remains; Google Hub owns Calendar |
| googleCalendarLegacyInventory test | delete | obsolete legacy-surface inventory |

## Acceptance rule

Repository search must find no legacy Settings Google Workspace surface, no user-facing Workspace tab, and no Settings import of the deleted Google-only service modules. The only user-facing Google application surface is Google Hub.
