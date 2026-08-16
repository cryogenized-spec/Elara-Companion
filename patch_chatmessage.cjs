const fs = require('fs');
let file = fs.readFileSync('src/components/ChatMessage.tsx', 'utf8');

if (!file.includes('FileText')) {
  file = file.replace(
    `import { Copy, Check, RefreshCw, Edit3, AlertCircle, AlertTriangle, Sparkles, User, X, Play, Sliders, Code, Mail, ExternalLink } from 'lucide-react';`,
    `import { Copy, Check, RefreshCw, Edit3, AlertCircle, AlertTriangle, Sparkles, User, X, Play, Sliders, Code, Mail, ExternalLink, FileText, FileCode } from 'lucide-react';`
  );
}

file = file.replace(
  `                  {/* Render extracted canvases as interactive buttons */}`,
  `                  {/* Render workspace tool operations */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 border-t border-zinc-700/50 pt-3">
                      {message.toolCalls.map((tc, idx) => {
                         if (tc.name === 'create_artifact' || tc.name === 'update_artifact') {
                            const isMarkdown = tc.args?.type === 'markdown' || (tc.args?.name && tc.args.name.endsWith('.md'));
                            const Icon = isMarkdown ? FileText : FileCode;
                            return (
                              <button
                                key={'tc_'+idx}
                                onClick={() => { window.dispatchEvent(new Event('workspace-updated')); /* we can also focus the workspace */ }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-100 transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-900/80 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold truncate">{tc.args.name || (tc.name === 'update_artifact' ? 'Updated Artifact' : 'New Artifact')}</h4>
                                  <p className="text-xs text-emerald-300/80 mt-0.5 truncate">{tc.name === 'create_artifact' ? 'Created workspace artifact' : 'Updated workspace artifact'}</p>
                                </div>
                                <div className="text-xs font-medium text-emerald-400 px-2 py-1 rounded bg-emerald-950">
                                  Open in Workspace
                                </div>
                              </button>
                            );
                         }
                         return null;
                      })}
                    </div>
                  )}

                  {/* Render extracted canvases as interactive buttons */}`
);

fs.writeFileSync('src/components/ChatMessage.tsx', file);
