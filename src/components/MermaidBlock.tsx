import React, { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  content: string;
}

let configured = false;

const configureMermaid = () => {
  if (configured) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'dark',
    flowchart: { useMaxWidth: true, htmlLabels: false },
  });
  configured = true;
};

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ content }) => {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderId = `elara-mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      configureMermaid();
      setError(null);
      setSvg(null);
      try {
        const result = await mermaid.render(renderId, content.trim());
        if (!cancelled) setSvg(result.svg);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : 'Mermaid could not render this diagram.');
        }
      }
    };

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [content, renderId]);

  if (error) {
    return (
      <div className="my-4 overflow-hidden rounded-xl border border-amber-900/60 bg-amber-950/20">
        <div className="border-b border-amber-900/40 px-3 py-2 text-[11px] font-semibold text-amber-300">Mermaid diagram could not be rendered</div>
        <pre className="overflow-x-auto p-3 text-[11px] leading-5 text-zinc-400">{content}</pre>
        <div className="border-t border-amber-900/40 px-3 py-2 text-[10px] text-amber-200/70">{error}</div>
      </div>
    );
  }

  return (
    <div className="my-5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:p-5">
      {svg ? (
        <div className="flex min-w-max justify-center [&>svg]:h-auto [&>svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex min-h-24 items-center justify-center text-xs text-zinc-600">Rendering diagram…</div>
      )}
    </div>
  );
};
