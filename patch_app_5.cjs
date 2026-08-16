const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  `[LOCAL WORKSPACE CONTEXT]\\nYou have access to the user's local workspace artifacts via the provided function calling tools. Use them to create, read, update, or delete artifacts.\\n\`;`,
  `[LOCAL WORKSPACE CONTEXT]\\nYou have access to the user's local workspace artifacts via the provided function calling tools. Use them to create, read, update, or delete artifacts.\\nIMPORTANT RULE: When you create or update an artifact, DO NOT output the entire document content in your chat response. Instead, keep your chat response brief (e.g. "I've created the SOP in the workspace. You can open it from the artifact card.") and rely on the workspace tool to store the content.\\n\`;`
);

fs.writeFileSync('src/App.tsx', file);
