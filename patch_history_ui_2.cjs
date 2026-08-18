const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

const startMarker = '{historyModal && historyModal.isOpen && activeArtifact && (';
const startIndex = code.indexOf(startMarker);

if (startIndex !== -1) {
  // Find the matching brace for {historyModal...
  // Just use lastIndexOf(')}    </div>');
  const endIndex = code.lastIndexOf(')}    </div>');
  if (endIndex !== -1) {
    const newJsx = `{historyModal && historyModal.isOpen && activeArtifact && (() => {
        const allRevisions = activeArtifact.revisions || [];
        const items = [
          { id: null, name: 'Current State', date: Date.now(), source: 'unsaved' },
          ...allRevisions.map(r => ({ id: r.id, name: \`Revision \${r.revisionNumber}\`, date: r.createdAt, source: r.source })).reverse()
        ];
        
        let diffResult = null;
        if (historyModal.isComparing) {
           diffResult = compareRevisions(workspace!, activeArtifact.id, historyModal.compareRevisionId, historyModal.selectedRevisionId);
        }

        const handleSelectRevision = (id: string | null) => {
           let compareId = historyModal.compareRevisionId;
           if (historyModal.isComparing) {
              // If we are comparing, try to set the compareId to the one immediately before the newly selected one
              const idx = items.findIndex(item => item.id === id);
              if (idx >= 0 && idx + 1 < items.length) {
                 compareId = items[idx + 1].id;
              } else {
                 compareId = null;
              }
           }
           setHistoryModal({ ...historyModal, selectedRevisionId: id, compareRevisionId: compareId });
        };

        const handleToggleCompare = () => {
           if (historyModal.isComparing) {
              setHistoryModal({ ...historyModal, isComparing: false });
           } else {
              const idx = items.findIndex(item => item.id === historyModal.selectedRevisionId);
              let compareId = null;
              if (idx >= 0 && idx + 1 < items.length) {
                 compareId = items[idx + 1].id;
              }
              setHistoryModal({ ...historyModal, isComparing: true, compareRevisionId: compareId });
           }
        };

        return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
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
              <div className="w-72 border-r border-zinc-800 bg-zinc-950/30 flex flex-col">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                   <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Revisions</div>
                   <label className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">
                      <input 
                         type="checkbox" 
                         checked={historyModal.isComparing} 
                         onChange={handleToggleCompare}
                         className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                      />
                      Compare
                   </label>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 gap-1 flex flex-col">
                  {items.map(item => (
                    <div key={item.id || 'current'} className="flex flex-col gap-1">
                      <button
                        onClick={() => handleSelectRevision(item.id)}
                        className={\`w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col gap-1 transition-colors \${
                          historyModal.selectedRevisionId === item.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                        }\`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={\`font-medium \${item.id === null ? 'text-emerald-400' : ''}\`}>{item.name}</span>
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700">{item.source}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{item.id === null ? 'Unsaved or latest changes' : new Date(item.date).toLocaleString()}</span>
                      </button>
                      
                      {historyModal.isComparing && historyModal.selectedRevisionId === item.id && (
                         <div className="px-3 py-2 bg-zinc-950/50 rounded-lg border border-zinc-800/50 flex flex-col gap-2 mt-1 mb-2 animate-in slide-in-from-top-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Compare with:</span>
                            <select 
                               className="w-full bg-zinc-900 border border-zinc-700 rounded text-xs p-1 text-zinc-300 outline-none focus:border-emerald-500/50"
                               value={historyModal.compareRevisionId || ''}
                               onChange={(e) => setHistoryModal({ ...historyModal, compareRevisionId: e.target.value || null })}
                            >
                               {items.filter(i => i.id !== item.id).map(opt => (
                                  <option key={opt.id || 'current'} value={opt.id || ''}>{opt.name}</option>
                               ))}
                            </select>
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 bg-[#0a0a0a] overflow-y-auto custom-scrollbar flex flex-col">
                {historyModal.isComparing && diffResult ? (
                   <div className="flex flex-col h-full">
                      <div className="p-3 border-b border-zinc-800/50 bg-zinc-950/80 flex items-center justify-between shadow-sm z-10">
                         <div className="flex items-center gap-3">
                            <div className="px-2 py-1 bg-red-950/30 text-red-400 border border-red-900/30 rounded text-xs font-mono">
                               {items.find(i => i.id === historyModal.compareRevisionId)?.name || 'Unknown'}
                            </div>
                            <ArrowLeft className="w-3 h-3 text-zinc-600 rotate-180" />
                            <div className="px-2 py-1 bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 rounded text-xs font-mono">
                               {items.find(i => i.id === historyModal.selectedRevisionId)?.name || 'Unknown'}
                            </div>
                         </div>
                         {diffResult.identical && (
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
                               Identical - No Changes
                            </span>
                         )}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed custom-scrollbar">
                        {!diffResult.identical && diffResult.hunks?.map((d, i) => (
                           <div key={i} className={\`whitespace-pre-wrap px-2 py-0.5 rounded-sm \${
                             d.added ? 'text-emerald-400 bg-emerald-900/20' : 
                             d.removed ? 'text-red-400 bg-red-900/20 line-through opacity-70' : 
                             'text-zinc-500'
                           }\`}>
                             <span className="select-none inline-block w-4 opacity-50 mr-2 border-r border-zinc-800">{
                               d.added ? '+' : d.removed ? '-' : ' '
                             }</span>
                             {d.value}
                           </div>
                        ))}
                      </div>
                   </div>
                ) : (
                   <div className="p-6 text-zinc-300 text-sm whitespace-pre-wrap font-mono h-full">
                     {historyModal.selectedRevisionId === null 
                        ? localContent 
                        : (activeArtifact.revisions || []).find(r => r.id === historyModal.selectedRevisionId)?.content || 'Content not found.'}
                   </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-b-xl">
               <div className="text-xs text-zinc-500">
                  {historyModal.isComparing 
                     ? 'Viewing read-only difference comparison.' 
                     : (historyModal.selectedRevisionId === null ? 'Viewing current editable state.' : 'Viewing read-only historical revision.')}
               </div>
               <div className="flex gap-3">
                 <button onClick={() => setHistoryModal(null)} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors">Close</button>
                 {!historyModal.isComparing && historyModal.selectedRevisionId !== null && (
                   <button
                      onClick={() => {
                       const updatedWs = restoreRevision(workspace!, activeArtifact.id, historyModal.selectedRevisionId!);
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
        );
      })()}`;

    const newCode = code.substring(0, startIndex) + newJsx + '\n' + code.substring(endIndex + 2); // ')}' is 2 chars
    fs.writeFileSync('src/components/WorkspaceView.tsx', newCode);
  } else {
    console.log("End marker not found", endIndex);
  }
} else {
  console.log("Start marker not found");
}
