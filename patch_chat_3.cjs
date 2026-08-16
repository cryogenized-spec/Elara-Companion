const fs = require('fs');
let file = fs.readFileSync('server/routes/chat.ts', 'utf8');

file = file.replace(
  /\} else if \(\(part as any\)\.functionCall\) \{[\s\S]*?\} else if \(part\.text\) \{/,
  `} else if ((part as any).functionCall) {
              const fc = (part as any).functionCall;
              res.write(\`data: \${JSON.stringify({ toolCall: { name: fc.name, args: fc.args }, finishReason, safetyRatings })}\\n\\n\`);
            } else if (part.text) {`
);

fs.writeFileSync('server/routes/chat.ts', file);
