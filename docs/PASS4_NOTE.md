Pass 4 — Chat/stream orchestration extraction

Working branch: refactor/pass4-chat-runtime

Scope:
- Extract chat/stream orchestration from App.tsx.
- Leave UI rendering and conversation/folder ownership in place.
- Preserve existing runtime behavior.
- Do not modify Lockbox, memory, Workspace, Google integration, or settings behavior except where required to preserve existing interfaces.
- Do not remove the existing canonical runtime implementation unless the extracted controller calls it through the existing path.
