import React, { useEffect, useState } from 'react';
import type { CanvasData, Message } from '../types';
import { workspaceService } from '../services/workspaceService';
import { ThinkingScratchpad } from './ThinkingScratchpad';
import { MarkdownMessageRenderer } from './MarkdownMessageRenderer';
import { Copy, Check, RefreshCw, Edit3, AlertTriangle, Sliders, Play, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { EmailDraftButton } from './EmailDraftButton';

export interface UnifiedChatMessageProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  portraitImage?: string | null;
  fontSize?: number;
  textBackground?: string;
  isLastUserMessage?: boolean;
  onRegenerate?: () => void;
  onEditAndResend?: (messageId: string, newContent: string) => void;
  onRetry?: () => void;
  onCompleteResponse?: () => void;
  onOpenSettings?: () => void;
  onOpenCanvas?: (canvas: CanvasData) => void;
  onOpenArtifact?: (artifactId: string) => void;
}

export const getAssistantBackgroundClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx': return 'bg-[#000000]/95 border border-zinc-800 text-zinc-100 shadow-2xl';
    case 'midnight-blue': return 'bg-[#080f20]/95 border border-sky-900/60 text-zinc-100 shadow-2xl';
    case 'cyber-violet': return 'bg-[#120824]/95 border border-purple-900/60 text-zinc-100 shadow-2xl';
    case 'emerald-terminal': return 'bg-[#05140d]/95 border border-emerald-900/60 text-emerald-100 shadow-2xl';
    case 'frosted-glass': return 'bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-xl';
    case 'high-contrast': return 'bg-zinc-900 border-2 border-zinc-600 text-white shadow-xl';
    default: return 'bg-zinc-900/90 border border-zinc-800/80 text-zinc-200 shadow-md';
  }
};

export const getUserBubbleClasses = (bgStyle?: string) => {
  switch (bgStyle) {
    case 'deep-onyx': return 'bg-zinc-800/95 border border-zinc-700 text-white shadow-lg';
    case 'midnight-blue': return 'bg-sky-700/90 border border-sky-500/40 text-white shadow-lg';
    case 'cyber-violet': return 'bg-purple-700/90 border border-purple-500/40 text-white shadow-lg';
    case 'emerald-terminal': return 'bg-emerald-700/90 border border-emerald-500/40 text-white shadow-lg';
    case 'frosted-glass': return 'bg-sky-600/70 backdrop-blur-xl border border-sky-300/30 text-white shadow-lg';
    case 'high-contrast': return 'bg-sky-600 border-2 border-sky-300 text-white shadow-xl';
    default: return 'bg-sky-600/90 text-white shadow-lg';
  }
};

const renderDocumentCards = (
  message: Message,
  onOpenCanvas?: (canvas: CanvasData) => void,
  onOpenArtifact?: (artifactId: string) => void,
) => {
  const renderedArtifactIds = new Set<string>();
  const documentCards: { id: string; name: string; type: string; provider?: string; url?: string; isLegacyCanvas?: boolean; canvas?: CanvasData }[] = [];

  for (const artId of message.artifactIds || []) {
    const art = workspaceService.getArtifactById(artId);
    if (art && !renderedArtifactIds.has(art.id)) {
      renderedArtifactIds.add(art.id);
      documentCards.push({ id: art.id, name: art.name, type: art.type || 'markdown', provider: art.provider || 'local', url: art.url });
    }
  }

  for (const canvas of message.canvases || []) {
    if (canvas.artifactId && !renderedArtifactIds.has(canvas.artifactId)) {
      const art = workspaceService.getArtifactById(canvas.artifactId);
      renderedArtifactIds.add(canvas.artifactId);
      documentCards.push({ id: canvas.artifactId, name: art?.name || canvas.title, type: art?.type || 'markdown', provider: art?.provider || 'local', url: art?.url, canvas });
    } else if (!canvas.artifactId) {
      documentCards.push({ id: `legacy_${canvas.title}`, name: canvas.title, type: 'markdown', provider: 'local', isLegacyCanvas: true, canvas });
    }
  }

  if (!documentCards.length) return null;

  return (
    <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-zinc-700/50">
      {documentCards.map((doc, idx) => (
