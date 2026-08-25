import { useCallback } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Conversation, ElaraSettings, Folder } from '../../types';
import { exportAllDataJSON, importDataJSON, generateUniqueId } from '../../lib/storage';
import { clearApplicationPersistence } from '../../services/applicationPersistenceService';

export type ConversationControllerArgs = {
  conversations: Conversation[];
  folders: Folder[];
  settings: ElaraSettings;
  activeId: string | null;
  isStreaming: boolean;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setFolders: Dispatch<SetStateAction<Folder[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  applyImportedSettings: (nextSettings: ElaraSettings) => void;
  setRenameTargetId: Dispatch<SetStateAction<string | null>>;
  setDeleteTargetId: Dispatch<SetStateAction<string | null>>;
  stopStreaming: () => void;
  userHasScrolledUpRef: MutableRefObject<boolean>;
};

export function useConversationController({
  conversations, folders, settings, activeId, isStreaming,
  setConversations, setFolders, setActiveId, applyImportedSettings,
  setRenameTargetId, setDeleteTargetId, stopStreaming, userHasScrolledUpRef,
}: ConversationControllerArgs) {
  const handleNewConversation = useCallback(() => {
    if (isStreaming) stopStreaming();
    const newConv: Conversation = { id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    userHasScrolledUpRef.current = false;
  }, [isStreaming, setActiveId, setConversations, stopStreaming, userHasScrolledUpRef]);

  const handleCreateFolder = useCallback((name: string) => {
    const nextFolders = [...folders, { id: generateUniqueId('folder'), name, isExpanded: true }];
    setFolders(nextFolders);
  }, [folders, setFolders]);

  const handleRenameFolder = useCallback((id: string, name: string) => {
    const nextFolders = folders.map((folder) => folder.id === id ? { ...folder, name } : folder);
    setFolders(nextFolders);
  }, [folders, setFolders]);

  const handleDeleteFolder = useCallback((id: string) => {
    const nextFolders = folders.filter((folder) => folder.id !== id);
    const nextConversations = conversations.map((conversation) => conversation.folderId === id ? { ...conversation, folderId: undefined } : conversation);
    setFolders(nextFolders); setConversations(nextConversations);
  }, [conversations, folders, setConversations, setFolders]);

  const handleToggleFolder = useCallback((id: string) => {
    const nextFolders = folders.map((folder) => folder.id === id ? { ...folder, isExpanded: !folder.isExpanded } : folder);
    setFolders(nextFolders);
  }, [folders, setFolders]);

  const handleMoveToFolder = useCallback((conversationId: string, folderId: string | null) => {
    const nextConversations = conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, folderId: folderId || undefined } : conversation);
    setConversations(nextConversations);
  }, [conversations, setConversations]);

  const renameConversation = useCallback((renameTargetId: string | null, newTitle: string) => {
    if (!renameTargetId) return;
    setConversations((prev) => prev.map((conversation) => conversation.id === renameTargetId ? { ...conversation, title: newTitle } : conversation));
    setRenameTargetId(null);
  }, [setConversations, setRenameTargetId]);

  const deleteConversation = useCallback((deleteTargetId: string | null) => {
    if (!deleteTargetId) return;
    const remaining = conversations.filter((conversation) => conversation.id !== deleteTargetId);
    setConversations(remaining);
    if (activeId === deleteTargetId) setActiveId(remaining.length > 0 ? remaining[0].id : null);
    setDeleteTargetId(null);
  }, [activeId, conversations, setActiveId, setConversations, setDeleteTargetId]);

  const clearAllData = useCallback(() => {
    void clearApplicationPersistence();
    const newConv: Conversation = { id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations([newConv]); setActiveId(newConv.id);
  }, [setActiveId, setConversations]);

  const exportAll = useCallback(() => exportAllDataJSON(conversations, settings), [conversations, settings]);

  const importData = useCallback((jsonStr: string) => {
    const { conversations: importedConversations, settings: importedSettings } = importDataJSON(jsonStr);
    if (importedConversations.length > 0) {
      setConversations(importedConversations); setActiveId(importedConversations[0].id);
    }
    if (importedSettings) {
      const mergedSettings = { ...settings, ...importedSettings };
      applyImportedSettings(mergedSettings);
    }
  }, [applyImportedSettings, setActiveId, setConversations, settings]);

  return { handleNewConversation, handleCreateFolder, handleRenameFolder, handleDeleteFolder, handleToggleFolder, handleMoveToFolder, renameConversation, deleteConversation, clearAllData, exportAll, importData };
}
