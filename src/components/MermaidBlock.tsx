import React, { useCallback, useEffect, useId, useState } from 'react';

interface MermaidBlockProps {
  content: string;
}

let mermaidModule: typeof import('mermaid') | null = null;
let configured = false;

const loadMermaid = async () => {
  mermaidModule ??= await import('mermaid');
  const mermaid = mermaidModule.default;
  if (!configured) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'dark',
      flowchart: { useMaxWidth: true, htmlLabels: false },
    });
    configured = true;
  }
  return mermaid;
};

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ content }) => {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const renderId = `elara-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const renderDiagram = useCallback(async () => {
    setError(null);
    setSvg(null);
    try {
      const mermaid = await loadMermaid();
      const result = await mermaid.render(renderId, content.trim());
      setSvg(result.svg);
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : 'Mermaid could not render this diagram.');
    }
  }, [content, renderId]);

  useEffect(() => {
    void renderDiagram();
  }, [renderDiagram]);

  const copySource = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1400);
    } catch {
      setCopyState('idle');
    }
  };

  if (error) {
    return (
      <div className="my-4 overflow-hidden rounded-xl border border-amber-900/60 bg-amber-950/20">
        <div className="flex items-center justify-between gap-3 border-b border-amber-900/40 px-3 py-2">
          <div className="text-[11px] font-semibold text-amber-300">Mermaid diagram could not be rendered</div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => void renderDiagram()} className="rounded-lg border border-amber-900/60 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-950/40">Retry</button>
            <button onClick={() => void copySource()} className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-900">{copyState === 'copied' ? 'Copied' : 'Copy source'}</button>
          </div>
        </div>
        <pre className="overflow-x-auto p-3 text-[11px] leading-5 text-zinc-400">{content}</pre>
        <div className="border-t border-amber-900/40 px-3 py-2 text-[10px] text-amber-200/70">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:p-5">
      <div className="mb-2 flex items-center justify-end">
        <button onClick={() => void copySource()} className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200">{copyState === 'copied' ? 'Copied' : 'Copy Mermaid'}</button>
      </div>
      {svg ? (
        <div className="flex min-w-max justify-center [&>svg]:h-auto [&>svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex min-h-24 items-center justify-center text-xs text-zinc-600">Rendering diagram…</div>
      )}
    </div>
  );
};
