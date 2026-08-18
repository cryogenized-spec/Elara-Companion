const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceView.tsx', 'utf8');

// Import Clock icon
code = code.replace(
  "import { MarkdownRenderer } from './MarkdownRenderer';",
  "import { MarkdownRenderer } from './MarkdownRenderer';\nimport { Clock } from 'lucide-react';"
);

// Add History button
code = code.replace(
  `<button onClick={() => setLinkModal({isOpen: true, linkUrl: '', linkMode: 'compare_only'})} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">\n                    Link Google Doc\n                  </button>`,
  `<button onClick={() => setHistoryModal({isOpen: true, selectedRevisionId: null})} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">\n                    <Clock className="w-3.5 h-3.5" />\n                    History\n                  </button>\n                  <button onClick={() => setLinkModal({isOpen: true, linkUrl: '', linkMode: 'compare_only'})} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">\n                    Link Google Doc\n                  </button>`
);

fs.writeFileSync('src/components/WorkspaceView.tsx', code);
