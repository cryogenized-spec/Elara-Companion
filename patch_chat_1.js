const fs = require('fs');
let file = fs.readFileSync('server/routes/chat.ts', 'utf8');

file = file.replace(
  `            if (msg.content) {`,
  `            if (msg.toolCalls && msg.toolCalls.length > 0) {
              for (const tc of msg.toolCalls) {
                parts.push({ functionCall: { name: tc.name, args: tc.args } });
              }
            }
            if (msg.toolResponses && msg.toolResponses.length > 0) {
              for (const tr of msg.toolResponses) {
                parts.push({ functionResponse: { name: tr.name, response: tr.response } });
              }
            }
            if (msg.content) {`
);

file = file.replace(
  `            if (msg.content) {
              parts.push({ text: msg.content });
            } else if (parts.length > 0) {
              parts.push({ text: '[Attached image]' });
            }`,
  `            if (msg.content) {
              parts.push({ text: msg.content });
            } else if (parts.length === 0 || (parts.length === 1 && parts[0].inlineData)) {
              if (parts.length > 0) {
                parts.push({ text: '[Attached image]' });
              }
            }`
);

fs.writeFileSync('server/routes/chat.ts', file);
