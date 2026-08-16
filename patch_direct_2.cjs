const fs = require('fs');
let file = fs.readFileSync('src/lib/geminiDirectClient.ts', 'utf8');

file = file.replace(
  `  history?: { role: string; content: string; image?: string }[];`,
  `  history?: { role: string; content: string; image?: string; toolCalls?: any[]; toolResponses?: any[] }[];`
);

fs.writeFileSync('src/lib/geminiDirectClient.ts', file);
