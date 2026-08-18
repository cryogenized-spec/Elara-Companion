const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

// Import Save icon
code = code.replace(
  "import { Clock } from 'lucide-react';",
  "import { Clock, Save } from 'lucide-react';"
);

// Add Save Checkpoint button
code = code.replace(
  `<button onClick={() => setHistoryModal({isOpen: true, selectedRevisionId: null})} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">`,
  `<button onClick={() => {
                      if (activeArtifact) {
                        let currentWs = workspace;
                        if (localContent !== activeArtifact.content) {
                          currentWs = updateArtifact(workspace, activeArtifact.id, { content: localContent });
                        }
                        const newWs = createCheckpoint(currentWs, activeArtifact.id, 'user', 'user');
                        setWorkspace(newWs);
                      }
                    }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Checkpoint</span>
                  </button>
                  <button onClick={() => setHistoryModal({isOpen: true, selectedRevisionId: null})} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
