const fs = require('fs');
let file = fs.readFileSync('src/components/ChatMessage.tsx', 'utf8');

file = file.replace(
  `onClick={() => { window.dispatchEvent(new Event('workspace-updated')); /* we can also focus the workspace */ }}`,
  `onClick={() => { window.dispatchEvent(new Event('open-workspace-view')); }}`
);

fs.writeFileSync('src/components/ChatMessage.tsx', file);
