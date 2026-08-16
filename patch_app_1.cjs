const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  `import { getWorkspace } from './lib/workspaceStorage';`,
  `import { getWorkspace } from './lib/workspaceStorage';
import { executeWorkspaceOperation } from './lib/workspaceOperations';`
);
if (!file.includes('executeWorkspaceOperation')) {
  file = file.replace(
    `import { WorkspaceView } from './components/WorkspaceView';`,
    `import { WorkspaceView } from './components/WorkspaceView';
import { executeWorkspaceOperation } from './lib/workspaceOperations';`
  );
}

file = file.replace(
  `    let accumulatedText = '';`,
  `    let accumulatedText = '';
    let accumulatedToolCalls: any[] = [];`
);

file = file.replace(
  `    const handleChunkArrival = (chunk: {
      text?: string;
      thoughtText?: string;
      finishReason?: string;
      safetyRatings?: any;
    }) => {`,
  `    const handleChunkArrival = (chunk: {
      text?: string;
      thoughtText?: string;
      finishReason?: string;
      safetyRatings?: any;
      toolCall?: { name: string; args: any };
    }) => {`
);

file = file.replace(
  `      // Handle content text chunks
      if (chunk.text) {
        accumulatedText += chunk.text;
      }`,
  `      // Handle tool calls
      if (chunk.toolCall) {
        accumulatedToolCalls.push(chunk.toolCall);
      }
      
      // Handle content text chunks
      if (chunk.text) {
        accumulatedText += chunk.text;
      }`
);

file = file.replace(
  `                    content: finalCleanContent,
                    canvases,
                  }
                : m`,
  `                    content: finalCleanContent,
                    canvases,
                    toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                  }
                : m`
);

fs.writeFileSync('src/App.tsx', file);
