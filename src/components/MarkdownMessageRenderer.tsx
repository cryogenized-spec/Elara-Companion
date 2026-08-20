import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Mail } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

export interface MarkdownMessageRendererProps {
  children: string;
  className?: string;
}

const isGmailDraftUrl = (href?: string) =>
  typeof href === 'string' && href.startsWith('https://mail.google.com/mail/');

const GmailDraftLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-3 py-1.5 my-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 hover:text-white text-xs font-medium transition-all shadow-sm group no-underline"
    title="Open draft in Gmail"
  >
    <span className="p-1 rounded-lg bg-red-900/60 text-red-400 group-hover:text-red-200">
      <Mail className="w-3.5 h-3.5" />
    </span>
    <span>{children}</span>
    <ExternalLink className="w-3 h-3 text-red-400/80 group-hover:text-red-200 transition-transform group-hover:translate-x-0.5" />
  </a>
);

export const MarkdownMessageRenderer: React.FC<MarkdownMessageRendererProps> = ({ children, className }) => (
  <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1({ children }) {
          return <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-4 mb-2 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-3.5 mb-2 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base sm:text-lg font-semibold tracking-tight mt-3 mb-1.5 first:mt-0">{children}</h3>;
        },
        h4({ children }) {
          return <p className="font-semibold mt-2.5 mb-1">{children}</p>;
        },
        h5({ children }) {
          return <p className="font-semibold mt-2.5 mb-1">{children}</p>;
        },
        h6({ children }) {
          return <p className="font-semibold mt-2.5 mb-1">{children}</p>;
        },
        p({ children }) {
          return <p className="mb-2.5 last:mb-0 leading-relaxed break-words">{children}</p>;
        },
        strong({ children }) {
          return <strong className="font-semibold text-inherit">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-sky-100/90 font-serif leading-relaxed px-0.5">{children}</em>;
        },
        del({ children }) {
          return <del className="text-zinc-400 decoration-zinc-500">{children}</del>;
        },
        ul({ children }) {
          return <ul className="list-disc list-outside ml-5 mb-2.5 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-outside ml-5 mb-2.5 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="pl-1 leading-relaxed break-words">{children}</li>;
        },
        input({ type, checked }) {
          if (type !== 'checkbox') return null;
          return (
            <input
              type="checkbox"
              checked={Boolean(checked)}
              disabled
              readOnly
              className="mr-2 align-middle accent-sky-500"
              aria-label={checked ? 'Completed task' : 'Incomplete task'}
            />
          );
        },
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-sky-500/60 pl-3 my-2.5 italic text-zinc-400">{children}</blockquote>;
        },
        hr() {
          return <hr className="my-4 border-0 border-t border-zinc-700/70" />;
        },
        code({ inline, className, children, ...props }: any) {
          const match = /language-([\w-]+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          if (!inline) {
            return <CodeBlock language={match?.[1] || 'text'} value={codeString} />;
          }
          return (
            <code className="bg-zinc-800/90 text-sky-300 px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-700/50" {...props}>
              {children}
            </code>
          );
        },
        a({ href, children }) {
          if (isGmailDraftUrl(href)) return <GmailDraftLink href={href}>{children}</GmailDraftLink>;
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline break-words">
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border border-zinc-800">
              <table className="w-full min-w-max text-left text-xs border-collapse">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-zinc-800/70">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-2 border-b border-zinc-700 font-semibold text-zinc-300 align-top">{children}</th>;
        },
        td({ children }) {
          return <td className="px-3 py-2 border-b border-zinc-800 align-top">{children}</td>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
