import React, { useState } from 'react';
import { CheckSquare, Code2, ExternalLink, List, Minus, Quote, Table2, X } from 'lucide-react';

const REFERENCE_URL = 'https://github.com/cryogenized-spec/Elara-companion-app-v2/blob/main/docs/ELARA_CHAT_MARKDOWN.md';

const Example: React.FC<{ label: string; code: string; className?: string }> = ({ label, code, className }) => (
  <div className={className}>
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
    <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 text-[11px] leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">
      <code>{code}</code>
    </pre>
  </div>
);

interface MarkdownHelpButtonProps {
  inline?: boolean;
}

export const MarkdownHelpButton: React.FC<MarkdownHelpButtonProps> = ({ inline = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={inline
          ? 'inline-flex items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-mono font-semibold text-zinc-500 hover:bg-zinc-800 hover:text-sky-300 transition-colors'
          : 'hidden'}
        aria-label="Open Markdown help"
        title="Markdown help"
      >
        M↓
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="markdown-help-title">
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 id="markdown-help-title" className="text-sm font-semibold text-white">Markdown in Elara Chat</h2>
                <p className="text-[11px] text-zinc-500">Quick formatting reference for messages and roleplay.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white" aria-label="Close Markdown help"><X className="h-4 w-4" /></button>
            </div>

            <div className="min-h-0 overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Example label="Emphasis" code={'**bold**\n*italic*\n~~strikethrough~~'} />
                <Example label="Lists" code={'- bullet\n  - nested\n\n1. ordered\n2. list'} />
                <Example label="Quote / aside" code={'> This is quoted or indented text.'} />
                <Example label="Rule" code={'---'} />
                <Example label="Table" code={'| Part | Status |\n|---|---|\n| Valve | ✅ |\n| Seal | ⚠️ |'} className="sm:col-span-2" />
                <Example label="Code" code={'`inline()`\n\n```ts\nconst ready = true;\n```'} />
                <Example label="Task list" code={'- [ ] Check valve\n- [x] Replace seal'} />
                <Example label="Roleplay" code={'*She pauses.*\n\n**"All right."**\n\n> The room falls quiet.'} className="sm:col-span-2" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><List className="h-3 w-3" /> Lists</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><Table2 className="h-3 w-3" /> Tables</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><Code2 className="h-3 w-3" /> Code</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><Quote className="h-3 w-3" /> Quotes</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><Minus className="h-3 w-3" /> Rules</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1"><CheckSquare className="h-3 w-3" /> Tasks</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
              <p className="text-[10px] leading-relaxed text-zinc-500">Raw HTML and document-heavy Markdown extensions are intentionally not part of Elara Chat Markdown.</p>
              <a href={REFERENCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-700/50 bg-sky-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 transition-colors hover:bg-sky-900/50 hover:text-white">Full reference <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
