# Pass 7 final handoff

Gemini Interactions is the canonical production Chat transport. The old GenerateContent stream implementation has been reduced to a provider-free forwarding shim, and the obsolete request-identity generation test has been removed. Final caller extraction can now remove the shim entirely.
