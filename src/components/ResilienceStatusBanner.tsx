import React, { useEffect, useState } from 'react';
import type { ResilienceStatus } from '../lib/resilienceStatus';
import { subscribeResilienceStatus } from '../lib/resilienceStatus';

const LABELS: Record<string, string> = {
  'gemini-3.7-flash': 'Gemini 3.7 Flash',
  'gemini-3.6-flash': 'Gemini 3.6 Flash',
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite',
};

export const ResilienceStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<ResilienceStatus | null>(null);
  useEffect(() => subscribeResilienceStatus(setStatus), []);
  if (!status) return null;

  const model = LABELS[status.model] || status.model;
  const preferred = LABELS[status.preferredModel] || status.preferredModel;
  const text = status.probingPreferred
    ? `Preferred model ${preferred} restored.`
    : status.usedFallback
      ? `Temporarily using ${model}.`
      : `Gemini retrying (attempt ${status.attempts}).`;

  return <div className="fixed left-1/2 top-3 z-[110] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950/95 px-3.5 py-2 text-xs text-zinc-200 shadow-xl backdrop-blur-md" role="status">{text}</div>;
};
