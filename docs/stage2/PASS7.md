# Pass 7 — Legacy Generation Purge

The final migration pass makes Gemini Interactions the sole production Chat transport and removes the retired GenerateContent Chat runtime implementation and its obsolete request-identity test story.

A temporary forwarding filename remains only for callers that have not yet been physically moved; it contains no provider transport logic.
