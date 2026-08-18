const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

const historyModalJSX = `
      {historyModal && historyModal.isOpen && activeArtifact && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-xl">
              <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Revision History - {activeArtifact.name}
              </h3>
              <button onClick={() => setHistoryModal(null)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="w-64 border-r border-zinc-800 bg-zinc-950/30 overflow-y-auto custom-scrollbar flex flex-col p-2 gap-1">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Revisions
                </div>
                {/* Current Content Item */}
                <button
                  onClick={() => setHistoryModal({ isOpen: true, selectedRevisionId: null })}
                  className={\`w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col gap-1 transition-colors \${
                    historyModal.selectedRevisionId === null ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                  }\`}
                >
                  <span className="font-medium text-emerald-400">Current State</span>
                  <span className="text-[10px] text-zinc-500">Unsaved or latest changes</span>
                </button>
                {/* Historical Revisions */}
                {(activeArtifact.revisions || []).slice().reverse().map(rev => (
                  <button
                    key={rev.id}
                    onClick={() => setHistoryModal({ isOpen: true, selectedRevisionId: rev.id })}
                    className={\`w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col gap-1 transition-colors \${
                      historyModal.selectedRevisionId === rev.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                    }\`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-medium">Revision {rev.revisionNumber}</span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700">{rev.source}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{new Date(rev.createdAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 bg-[#0a0a0a] overflow-y-auto custom-scrollbar p-6">
                {historyModal.selectedRevisionId === null ? (
                  <div className="text-zinc-300 text-sm whitespace-pre-wrap font-mono">
                    {localContent}
                  </div>
                ) : (
                  <div className="text-zinc-400 text-sm whitespace-pre-wrap font-mono">
                    {(activeArtifact.revisions || []).find(r => r.id === historyModal.selectedRevisionId)?.content || 'Content not found.'}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-b-xl">
               <div className="text-xs text-zinc-500">
                  {historyModal.selectedRevisionId === null ? 'Viewing current editable state.' : 'Viewing read-only historical revision.'}
               </div>
               <div className="flex gap-3">
                 <button onClick={() => setHistoryModal(null)} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors">Close</button>
                 {historyModal.selectedRevisionId !== null && (
                   <button 
                     onClick={() => {
                       const updatedWs = restoreRevision(workspace, activeArtifact.id, historyModal.selectedRevisionId);
                       setWorkspace(updatedWs);
                       const restored = updatedWs.artifacts.find(a => a.id === activeArtifact.id);
                       if (restored) setLocalContent(restored.content);
                       setHistoryModal(null);
                     }} 
                     className="px-4 py-2 text-sm font-medium text-emerald-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
                   >
                     Restore this version
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  `    </div>\n  );\n};\n`,
  historyModalJSX + `    </div>\n  );\n};\n`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
