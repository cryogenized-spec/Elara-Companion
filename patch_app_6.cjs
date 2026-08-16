const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  `        nextHistory = [...historyMessages, assistantMsg, toolRespMsg];`,
  `        const updatedAssistantMsg = {
          ...assistantMsg,
          content: accumulatedText,
          toolCalls: accumulatedToolCalls
        };
        nextHistory = [...historyMessages, updatedAssistantMsg, toolRespMsg];`
);

fs.writeFileSync('src/App.tsx', file);
