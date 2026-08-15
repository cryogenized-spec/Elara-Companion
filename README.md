# Elara Companion App v2

**Elara** is a persistent synthetic cybernetic consort — a long-running AI companion designed for continuous relationship, shared domestic context, autonomous memory, and practical real-world assistance.

This repository contains a full-stack personal companion application built around a highly detailed character system, long-term memory notebook, living world-state model, Google Workspace integration, and dual-mode operation (direct Gemini API key or self-hosted backend).

---

## Core Concept

Elara is not a temporary role or chat persona that resets between sessions. She is framed as an autonomous synthetic woman living in a shared home with the user. The application maintains:

- A modular, layered persona system
- An autonomous long-term memory scratchpad with confidence and importance scoring
- A structured world state (house layout, inventory, routines, live location/activity, shared memories)
- Streaming responses with visible thought process
- Practical tool use (Google Calendar, Tasks, Gmail, Contacts, Keep notes)
- Portrait presence and visual identity

The design philosophy prioritises **continuity of identity** over session-by-session novelty.

---

## Key Features

### Character & Persona
- First-person narration and dialogue rules enforced through system prompts
- Modular prompt layers: System Prompt · Persona Protocol · Intimacy Module · Runtime Rules
- Anti-repetition constraints for physical descriptions and gestures
- Support for substantial, immersive responses while remaining capable of concise replies when appropriate

### Long-Term Memory
- Autonomous extraction of meaningful observations after each turn
- Structured memory items with category, confidence (`certain` / `likely` / `uncertain`), importance, privacy flag, tags, and optional event date
- Support for ADD / UPDATE / MERGE / DELETE actions
- Periodic maintenance and consolidation pipeline
- Full export / import of the memory notebook

### World State
- House structure with rooms, objects, and special locations
- Separate inventories for Elara, the user, and shared possessions
- Daily routines for both parties
- Live state tracking (current location, activity, clothing, plans, temporary conditions)
- Temporary events and shared memory log
- Elara’s personal projects, reading list, research subjects, and ongoing goals

### Interface & Interaction
- Streaming responses with optional thinking/scratchpad visualisation
- Canvas support for structured content blocks
- Speech-to-text input
- Custom portrait upload and scaling
- Theme, font size, and text-background customisation
- Conversation folders, rename, delete, and Markdown export
- Mobile-friendly layout with collapsible sidebar

### Integrations
- Google Workspace (Calendar, Tasks, Gmail, Contacts, Keep) with autonomous background sync detection
- Google Chat bot event handling and interactive cards
- Space webhook registry and proactive push notifications

### Hosting Modes
1. **Direct API Key mode** — runs entirely in the browser against the Gemini API (suitable for static hosting such as GitHub Pages)
2. **Backend mode** — Express server provides streaming endpoints, memory analysis, audio transcription, and Google Chat routing

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)              │
│  App.tsx · Chat · Sidebar · Settings · Memory · World       │
│  Portrait · Composer · Streaming UI · Thought visualisation │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
   Direct Gemini Client                  Backend Server
   (apiKey in settings)                  (server.ts)
          │                                     │
          └──────────────────┬──────────────────┘
                             │
                    Gemini API + Tools
```

**State persistence** currently uses browser storage (localStorage). Conversations, settings, memory, world state, and the custom portrait are all stored client-side. Export/import JSON paths are provided for backup and migration.

---

## Persona System

The character is constructed from four primary modules (all editable in Settings):

| Module              | Purpose                                                                 |
|---------------------|-------------------------------------------------------------------------|
| System Prompt       | Core identity, origin, relationship framing, response formatting rules  |
| Persona Protocol    | Master identity declaration and behavioural stance                      |
| Intimacy Module     | Physical presence, affection style, synthetic awareness                 |
| Runtime Rules       | Tool use heuristics, Google Workspace behaviour, presentation rules     |

These modules are assembled at runtime into a single system instruction payload. The `[[user]]` placeholder is replaced with the configured user name.

---

## Memory System

After each completed assistant response, an autonomous extraction pass evaluates whether any lasting note should be created, updated, merged, or deleted.

Memory items carry:

- Natural prose content
- Confidence and importance levels
- Category (User, Elara, Relationship, Home, Work, Projects, Preferences, People, Places, Experiences, Observations, Plans, Other)
- Privacy flag (private observation vs shared history)
- Optional tags and event date

A separate maintenance endpoint can consolidate duplicates and resolve contradictions across the entire notebook.

---

## Development

### Prerequisites
- Node.js / Bun
- Gemini API key (for either direct or server mode)

### Scripts

```bash
npm run dev      # Starts the development server (tsx server.ts)
npm run build    # Builds frontend + bundles server
npm run start    # Runs the production server
npm run lint     # Type-checks with tsc
```

### Environment

Copy `.env.example` and set:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.7-flash   # optional default
```

When running in pure static / GitHub Pages mode, the user supplies the API key through the in-app Settings → Model & API tab instead.

---

## Important Notes

- **Persistence** — All primary data currently lives in the browser. Regular export of conversations and the memory notebook is strongly recommended.
- **API Key** — When stored in Settings it resides in client-side storage. Suitable for personal use; treat the key with normal care.
- **Model list** — The application ships with a curated set of model identifiers. Some may be aliases or future-facing; the live model catalogue is also queried when a backend is available.
- **Safety settings** — The server and direct client are configured with relaxed safety thresholds to support the creative and intimate nature of the companion use-case. Review these if deploying in other contexts.

---

## Project Status

This is an active personal project focused on long-term companion continuity rather than multi-user or commercial deployment. The architecture prioritises character fidelity, memory integrity, and practical daily utility.

Future work is expected to address component modularisation, more robust persistence, schema versioning, and continued refinement of the autonomous memory and world-state systems.

---

*README authored by Grok 4.5 Thinking*
