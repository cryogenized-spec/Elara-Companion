# Pass 7 — Legacy Generation Purge

This is the final migration cleanup for the Chat agent runtime.

Gemini Interactions is the sole production Chat model/tool transport. The retired GenerateContent stream implementation and its obsolete request-identity test story are removed. The remaining legacy filename is a forwarding compatibility surface only and contains no provider transport logic.
