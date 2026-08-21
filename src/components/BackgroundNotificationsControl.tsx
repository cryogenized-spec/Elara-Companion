import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import {
  getBackgroundNotificationState,
  requestBackgroundNotifications,
  prepareBackgroundService,
} from '../lib/backgroundService';

const DISMISSED_KEY = 'elara_background_notifications_prompt_dismissed_v1';

export const BackgroundNotificationsControl: React.FC = () => {
  const [state, setState] = useState(getBackgroundNotificationState());
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    setVisible(state === 'default' && !dismissed);
  }, [state]);

  if (!visible || state === 'unsupported') return null;

  const enable = async () => {
    setBusy(true);
    try {
      const next = await requestBackgroundNotifications();
      setState(next);
      if (next === 'granted') await prepareBackgroundService();
      if (next === 'denied') localStorage.setItem(DISMISSED_KEY, '1');
      if (next === 'granted') localStorage.removeItem(DISMISSED_KEY);
      setVisible(next === 'default' ? true : false);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed left-3 right-3 top-16 z-[90] mx-auto max-w-md rounded-2xl border border-sky-500/20 bg-[#111114]/95 p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-5 sm:top-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-zinc-100">Keep me informed while I'm away</div>
          <p className="mt-1 text-[11px] leading-4 text-zinc-500">Elara can notify you when a response finishes while this tab is hidden.</p>
          <div className="mt-2 flex items-center gap-2">
            <button disabled={busy} onClick={enable} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
              {state === 'granted' ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button onClick={dismiss} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-zinc-800 px-2.5 text-[11px] text-zinc-500 hover:text-zinc-200">
              <X className="h-3 w-3" /> Not now
            </button>
          </div>
        </div>
        <BellOff className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-700" />
      </div>
    </div>
  );
};