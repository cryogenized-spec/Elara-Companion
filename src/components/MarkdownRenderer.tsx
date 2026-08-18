import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <article className="w-full max-w-none break-words text-[14px] leading-7 text-zinc-200 sm:text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-1 text-2xl font-semibold tracking-tight text-zinc-50">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-7 text-xl font-semibold tracking-tight text-zinc-100">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-semibold text-zinc-100">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-5 text-base font-semibold text-zinc-200">{children}</h4>,
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-50">{children}</strong>,
          em: ({ children }) => <em className="text-zinc-100">{children}</em>,
          ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-emerald-500/60 bg-zinc-900/50 px-4 py-2 text-zinc-400">{children}</blockquote>,
          hr: () => <hr className="my-6 border-zinc-800" />,
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className);
            return isBlock ? (
              <pre className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-[12px] leading-6 text-zinc-200 shadow-inner">
                <code className={className}>{children}</code>
              </pre>
            ) : (
              <code {...props} className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[12px] text-emerald-300">
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-300" />,
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-zinc-800">
              <table {...props} className="min-w-full border-collapse text-left text-[12px]" />
            </div>
          ),
          th: ({ children }) => <th className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 font-semibold text-zinc-200">{children}</th>,
          td: ({ children }) => <td className="border-b border-zinc-900 px-3 py-2 align-top text-zinc-300">{children}</td>,
        }}
      >
        {content || 'Nothing written yet.'}
      </ReactMarkdown>
    </article>
  );
};
