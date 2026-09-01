# Pass 7 — Legacy Generation Purge

Pass 7 is the final cleanup pass for the Chat runtime migration.

The Interactions runtime is now the sole production Chat model/tool transport. This pass removes the temporary StreamTurn compatibility alias, deletes the obsolete GenerateContent Chat runtime, removes the retired request-generation stories/tests, and strengthens the architecture lock so those paths cannot be reintroduced silently.
