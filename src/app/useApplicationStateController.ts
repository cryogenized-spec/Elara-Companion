import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Conversation, ElaraSettings, Folder, MemoryScratchpadState, WorldState } from '../types';
import { DEFAULT_SETTINGS, generateUniqueId } from '../lib/storage';
import { DEFAULT_WORLD_STATE } from '../constants/defaultWorldState';
import { DEFAULT_MEMORY_STATE } from '../lib/memoryStorage';
import { loadMemoryState, saveMemoryState } from '../services/memoryService';
import { migrateFromLocalStorage, getDbConversations, getDbFolders, getDbSettings, getDbWorldState, getDbPortrait, setDbConversations, setDbFolders, setDbSettings, setDbWorldState, setDbPortrait } from '../lib/db';
import { requestGoogleBaseAuthorization } from '../lib/googleAuthorization';

const SETTINGS_CHANGED_EVENT = 'elara-settings-changed';
export type ApplicationState = {
  isLoaded: boolean; conversations: Conversation[]; folders: Folder[]; activeId: string | null; settings: ElaraSettings; worldState: WorldState; memoryState: MemoryScratchpadState; customPortrait: string | null;
  setConversations: Dispatch<SetStateAction<Conversation[]>>; setFolders: Dispatch<SetStateAction<Folder[]>>; setActiveId: Dispatch<SetStateAction<string | null>>; setSettings: Dispatch<SetStateAction<ElaraSettings>>; setWorldState: Dispatch<SetStateAction<WorldState>>; setMemoryState: Dispatch<SetStateAction<MemoryScratchpadState>>; setCustomPortrait: Dispatch<SetStateAction<string | null>>;
};

export function useApplicationStateController(): ApplicationState {
  const [isLoaded, setIsLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ElaraSettings>(DEFAULT_SETTINGS);
  const [worldState, setWorldState] = useState<WorldState>(DEFAULT_WORLD_STATE);
  const [memoryState, setMemoryState] = useState<MemoryScratchpadState>(DEFAULT_MEMORY_STATE);
  const [customPortrait, setCustomPortrait] = useState<string | null>(null);
  const googleRestoreAttempted = useRef(false);

  useEffect(() => {
    void migrateFromLocalStorage().then(async () => {
      setFolders(await getDbFolders()); setSettings(await getDbSettings()); setWorldState(await getDbWorldState()); setMemoryState(await loadMemoryState()); setCustomPortrait(await getDbPortrait());
      const loadedConvs = await getDbConversations();
      if (loadedConvs.length > 0) { setConversations(loadedConvs); setActiveId(loadedConvs[0].id); }
      else { const initialConv: Conversation = { id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() }; setConversations([initialConv]); setActiveId(initialConv.id); }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || googleRestoreAttempted.current || settings.googleStayConnected === false) return;
    googleRestoreAttempted.current = true;
    void requestGoogleBaseAuthorization(false).catch(() => undefined);
  }, [isLoaded, settings.googleStayConnected]);

  useEffect(() => {
    if (!isLoaded) return;
    const handleSettingsChanged = (event: Event) => { const detail = (event as CustomEvent<{ settings?: ElaraSettings }>).detail; if (detail?.settings) setSettings(detail.settings); };
    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged); return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  }, [isLoaded]);

  useEffect(() => { if (isLoaded) void setDbConversations(conversations); }, [conversations, isLoaded]);
  useEffect(() => { if (isLoaded) void setDbFolders(folders); }, [folders, isLoaded]);
  useEffect(() => { if (isLoaded) void setDbSettings(settings); }, [settings, isLoaded]);
  useEffect(() => { if (isLoaded) void setDbWorldState(worldState); }, [worldState, isLoaded]);
  useEffect(() => { if (isLoaded) void saveMemoryState(memoryState); }, [memoryState, isLoaded]);
  useEffect(() => { if (isLoaded) void setDbPortrait(customPortrait); }, [customPortrait, isLoaded]);

  return { isLoaded, conversations, folders, activeId, settings, worldState, memoryState, customPortrait, setConversations, setFolders, setActiveId, setSettings, setWorldState, setMemoryState, setCustomPortrait };
}
