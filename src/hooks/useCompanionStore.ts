import { useState, useEffect, useCallback } from 'react';
import { Conversation, ElaraSettings, WorldState, MemoryScratchpadState, Folder } from '../types';
import { 
  migrateFromLocalStorage, 
  getDbConversations, setDbConversations,
  getDbSettings, setDbSettings,
  getDbFolders, setDbFolders,
  getDbPortrait, setDbPortrait,
  getDbWorldState, setDbWorldState,
  getDbMemoryState, setDbMemoryState,
  clearDbStorage
} from '../lib/db';

export function useCompanionStore() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<ElaraSettings>({} as ElaraSettings);
  const [worldState, setWorldState] = useState<WorldState>({} as WorldState);
  const [memoryState, setMemoryState] = useState<MemoryScratchpadState>({} as MemoryScratchpadState);
  const [customPortrait, setCustomPortrait] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      await migrateFromLocalStorage();
      setConversations(await getDbConversations());
      setFolders(await getDbFolders());
      setSettings(await getDbSettings());
      setWorldState(await getDbWorldState());
      setMemoryState(await getDbMemoryState());
      setCustomPortrait(await getDbPortrait());
      setIsLoaded(true);
    }
    loadAll();
  }, []);

  const saveConversations = useCallback(async (newConvs: Conversation[]) => {
    setConversations(newConvs);
    await setDbConversations(newConvs);
  }, []);

  const saveFolders = useCallback(async (newFolders: Folder[]) => {
    setFolders(newFolders);
    await setDbFolders(newFolders);
  }, []);

  const saveSettings = useCallback(async (newSet: ElaraSettings) => {
    setSettings(newSet);
    await setDbSettings(newSet);
  }, []);

  const saveWorldState = useCallback(async (newWorld: WorldState) => {
    setWorldState(newWorld);
    await setDbWorldState(newWorld);
  }, []);

  const saveMemoryState = useCallback(async (newMem: MemoryScratchpadState) => {
    setMemoryState(newMem);
    await setDbMemoryState(newMem);
  }, []);

  const savePortrait = useCallback(async (newPortrait: string | null) => {
    setCustomPortrait(newPortrait);
    await setDbPortrait(newPortrait);
  }, []);

  const clearAll = useCallback(async () => {
    await clearDbStorage();
    window.location.reload();
  }, []);

  return {
    isLoaded,
    conversations, saveConversations,
    folders, saveFolders,
    settings, saveSettings,
    worldState, saveWorldState,
    memoryState, saveMemoryState,
    customPortrait, savePortrait,
    clearAll
  };
}
