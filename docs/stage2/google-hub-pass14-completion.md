# Google Hub — Pass 14 Completion

## Objective

Make Ask Elara a structured, credential-free Google context bridge rather than a prompt-only handoff. The context must describe the actual authorization boundary, action availability, relevant current capability/resource context, recent activity, and safety requirements without exposing credentials.

## Requirements ledger

### Required now
- [x] Structured Google account identity can be included without credentials.
- [x] Authorization state is included: authorized, partially-authorized, or unauthorized, plus granted/missing capability groups.
- [x] Capability state is canonical and action-aware.
- [x] Every declared action carries availability, required capability groups, kind, confirmation requirement, and destructive flag in agent context.
- [x] A selected Google resource can be represented with capability ID, resource type, resource ID, optional provider URL, safe metadata, and bounded content excerpt.
- [x] Activity is bounded to the most recent 20 entries.
- [x] Resource excerpts are bounded to 12,000 characters.
- [x] Ask Elara prompt generation embeds the structured context and explicitly treats it as read-only routing context.
- [x] Capability-level Ask Elara requests automatically carry the active capability as a structured resource context.
- [x] No access token, secret, or credential field is accepted by the Google Hub context contract.

### Required for integration
- [x] Existing Google Hub modal remains the integration point.
- [x] Existing capability module registry remains the composition point.
- [x] Existing canonical authorization provider remains the source of Google authorization truth.
- [x] Existing capability-state projector remains the source of action availability truth.

### Required for verification
- [x] Context tests cover partial/limited capability state.
- [x] Context tests cover unauthorized state.
- [x] Context tests cover fully enabled state.
- [x] Context tests cover selected resource identity and safe excerpt handling.
- [x] Context tests cover confirmation metadata and credential absence.
- [x] Context tests cover bounded activity and excerpt size.
- [x] Capability-state tests cover action requirements and safety metadata.

## Architecture

The canonical flow is:

Google provider/authentication
→ token-free authorization snapshot
→ canonical capability/action state projector
→ structured Google Hub agent context
→ Ask Elara prompt/context bridge

The Hub and agent must not invent independent permission semantics.

## Files changed in Pass 14

- `src/services/googleHubCapabilityState.ts`
- `src/services/googleHubCapabilityState.test.ts`
- `src/services/googleHubContextService.ts`
- `src/services/googleHubContextService.test.ts`
- `src/components/google/googleCapabilityModules.tsx`
- `src/components/google/GoogleHubModal.tsx`

## Safety boundary

The context contract contains no access token, credential, secret, or provider authentication object. Selected resource excerpts are bounded before entering the context. Consequential action metadata is descriptive only; execution remains behind the existing application/provider policy and confirmation flow.

## Verification status

Source-level acceptance review completed.

Dependency-backed TypeScript, lint, test, build, and browser execution are not claimed as passing because this environment has no successful project-dependency execution record for the final commit.

## Definition of done

Pass 14 is source-complete when all Required now and Required for integration items remain checked and the automated execution gate is run in an environment with project dependencies available. A green status must never be inferred from source review alone.
