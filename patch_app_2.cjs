const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(
  `    let isDone = false;`,
  `    let isDone = false;
    let shouldContinue = false;
    let nextHistory: any[] = [];`
);

file = file.replace(
  `      // Background memory extraction logic (only for the very first generated response in a new context)`,
  `      if (accumulatedToolCalls.length > 0) {
        shouldContinue = true;
        const toolResponses = [];
        let createdOrUpdatedArtifact = false;
        for (const call of accumulatedToolCalls) {
          const result = executeWorkspaceOperation(call);
          toolResponses.push({ name: call.name, response: result });
          if (result.success && (call.name === 'create_artifact' || call.name === 'update_artifact')) {
            createdOrUpdatedArtifact = true;
          }
        }
        
        const toolRespMsgId = generateUniqueId('msg_usr_tool');
        const toolRespMsg = {
          id: toolRespMsgId,
          role: 'user',
          content: '',
          timestamp: Date.now(),
          toolResponses
        };
        
        nextHistory = [...historyMessages, assistantMsg, toolRespMsg];
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              updatedAt: Date.now(),
              messages: [...c.messages, toolRespMsg],
            };
          })
        );
        
        if (createdOrUpdatedArtifact && currentView !== 'workspace') {
          setCurrentView('workspace');
          // Force a re-render of WorkspaceView by dispatching a custom event
          window.dispatchEvent(new Event('workspace-updated'));
        }
      }

      // Background memory extraction logic (only for the very first generated response in a new context)`
);

file = file.replace(
  `      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };`,
  `      if (!shouldContinue) {
        setIsStreaming(false);
      }
      abortControllerRef.current = null;
    }
    
    if (shouldContinue) {
      streamAssistantResponse(targetConvId, '', nextHistory, undefined);
    }
  };`
);

fs.writeFileSync('src/App.tsx', file);
