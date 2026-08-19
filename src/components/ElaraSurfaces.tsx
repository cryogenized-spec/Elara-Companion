import React, { useState } from 'react';
import { Grid2X2, X, Cloud } from 'lucide-react';
import { ArtifactsPanel } from './ArtifactsPanel';
import { GoogleWorkspaceSettingsPanel } from './GoogleWorkspaceSettingsPanel';

export const ElaraSurfaces: React.FC = () => {
  const [surface, setSurface] = useState<'artifacts' | 'google' | null>(null);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 sm:bottom-5 sm:right-5">
        <button
          onClick={() => setSurface('artifacts')}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/95 px-4 text-xs font-semibold text-zinc-200 shadow-2xl shadow-black/30 backdrop-blur-xl hover:border-violet-500/40 hover:text-white"
          title="Artifacts"
        >
          <Grid2X2 className="h-4 w-4 text-violet-400" />
          Artifacts
        </button>
        <button
          onClick={() => setSurface('google')}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/95 px-4 text-xs font-semibold text-zinc-200 shadow-2xl shadow-black/30 backdrop-blur-xl hover:border-sky-500/40 hover:text-white"
          title="Google Workspace"
        >
          <Cloud className="h-4 w-4 text-sky-400" />
          Google
        </button>
      </div>

      {surface === 'artifacts' && (
        <ArtifactsPanel onBack={() => setSurface(null)} />
      )}

      {surface === 'google' && (
        <div className="fixed inset-0 z-30 flex h-[100dvh] w-full flex-col bg-[#09090b] text-zinc-100">
          <header className="flex min-h-14 items-center gap-3 border-b border-zinc-800 bg-[#0d0d0f]/95 px-3 backdrop-blur-xl">
            <button onClick={() => setSurface(null)} className="h-9 w-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" title="Close">
              <X className="mx-auto h-4 w-4" />
            </button>
            <div>
              <div className="text-sm font-semibold">Google Workspace</div>
              <div className="text-[10px] text-zinc-500">Master authentication and refresh controls</div>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            <GoogleWorkspaceSettingsPanel />
          </main>
        </div>
      )}
    </>
  );
};
