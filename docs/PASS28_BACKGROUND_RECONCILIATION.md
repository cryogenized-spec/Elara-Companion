# Pass 28 — Background State Reconciliation

## Objective

Make durable background jobs independently recoverable and ensure completion/cleanup cannot race when multiple jobs belong to the same conversation.

## Findings

The previous persistence key was `conversationId`. Starting a second background job for the same conversation replaced the first recovery record, and completion of the older job could subsequently delete the newer job's record. This violated the durable-runtime invariant.

The resume controller also treated persisted jobs as effectively one-job-per-conversation and removed records by conversation rather than by the job identity that actually completed.

## Completed

- Background recovery records are now keyed and retired by `jobId`.
- Multiple outstanding jobs for one conversation are retained independently.
- Persisted records are validated before entering the recovery loop; malformed/legacy entries without a valid `jobId` are ignored.
- Resume reconciliation handles every persisted job independently.
- Workspace reconciliation can occur when a background result completes even when the originating conversation/message is no longer present in the live React state.
- UI message reconciliation remains best-effort; deleting a conversation or message no longer causes the durable job record to be deleted accidentally by another job's completion.

## Canonical invariant

- `jobId` is the identity of a background execution.
- `conversationId` identifies where a result should be projected, not which execution is being persisted.
- Completion/failure cleanup removes exactly the completed execution.
- Persisted job records remain the recovery source of truth until that execution reaches a terminal state and is reconciled.
- Workspace mutations are reconciled at the background-runtime boundary independently of UI lifecycle.

## Deliberately deferred

The foreground chat controller still contains an older cleanup call that predates the job-ID contract. The current composer prevents sending another message while the active stream is running, so the foreground path does not currently create overlapping same-conversation background jobs through the normal UI. A later chat/runtime extraction pass will migrate that remaining caller to explicit job-ID cleanup and remove the transitional compatibility surface.

Workspace ownership remains behind the existing background runtime client/service boundary. A later pass will establish the explicit runtime-to-Workspace reconciliation/event contract rather than introducing another direct storage owner here.
