import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MermaidBlock } from './MermaidBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <article className="w-full max-w-none break-words text-[15px] leading-7 text-zinc-200 sm:text-[16px] sm:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <h1 className="mb-5 mt-1 border-b border-zinc-800 pb-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-9 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-7 text-xl font-semibold text-zinc-100 sm:text-2xl">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-6 text-lg font-semibold text-zinc-200">{children}</h4>,
          p: ({ children }) => <p className="mb-5 max-w-[72ch] last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-50">{children}</strong>,
          em: ({ children }) => <em className="text-zinc-100">{children}</em>,
          ul: ({ children }) => <ul className="mb-5 ml-6 list-disc space-y-2 marker:text-zinc-500">{children}</ul>,
          ol: ({ children }) => <ol className="mb-5 ml-6 list-decimal space-y-2 marker:text-zinc-500">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          input: ({ type, checked, ...props }) => type === 'checkbox' ? <input {...props} type="checkbox" checked={checked} disabled className="mr-2 translate-y-[1px] accent-emerald-500" /> : <input {...props} type={type} />,
          blockquote: ({ children }) => <blockquote className="my-6 max-w-[72ch] border-l-2 border-emerald-500/60 bg-zinc-900/50 px-5 py-3 text-zinc-400 [&>p]:mb-0">{children}</blockquote>,
          hr: () => <hr className="my-8 border-zinc-800" />,
          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || '');
            const language = match?.[1]?.toLowerCase();
            const source = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return <MermaidBlock content={source} />;
            }

            const isBlock = Boolean(className);
            return isBlock ? (
              <pre className="my-6 max-w-full overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-[12px] leading-6 text-zinc-200 shadow-inner sm:text-[13px]">
                <code className={className}>{children}</code>
              </pre>
            ) : (
              <code {...props} className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[12px] text-emerald-300 sm:text-[13px]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="break-words text-emerald-400 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-300" />,
          table: ({ node, ...props }) => (
            <div className="my-6 max-w-full overflow-x-auto rounded-2xl border border-zinc-800">
              <table {...props} className="min-w-full border-collapse text-left text-[12px] sm:text-[13px]" />
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-900/90">{children}</thead>,
          th: ({ children }) => <th className="border-b border-zinc-800 px-3 py-2.5 font-semibold text-zinc-200 sm:px-4">{children}</th>,
          td: ({ children }) => <td className="border-b border-zinc-900 px-3 py-2.5 align-top text-zinc-300 sm:px-4">{children}</td>,
        }}
      >
        {content || 'Nothing written yet.'}
      </ReactMarkdown>
    </article>
  );
};
