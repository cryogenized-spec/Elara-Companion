import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

interface EmailDraftButtonProps {
  url: string;
  label?: string;
}

export const EmailDraftButton: React.FC<EmailDraftButtonProps> = ({
  url,
  label = 'Open Gmail Draft',
}) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 my-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 hover:text-white text-xs font-medium transition-all shadow-sm group no-underline"
      title="Open draft in Gmail"
    >
      <div className="p-1 rounded-lg bg-red-900/60 text-red-400 group-hover:text-red-200">
        <Mail className="w-3.5 h-3.5" />
      </div>
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 text-red-400/80 group-hover:text-red-200 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
};
