import React, { useState, useRef, useEffect } from 'react';
import { ElaraSettings, AVAILABLE_MODELS, PersonaSnapshot } from '../types';
import { getDbSnapshots, setDbSnapshots } from '../lib/db';
import { 
  DEFAULT_ELARA_SYSTEM_PROMPT,
  DEFAULT_PERSONA_PROTOCOL,
  DEFAULT_INTIMACY_MODULE,
  DEFAULT_RUNTIME_RULES
} from '../constants/defaultPrompt';
import { DEFAULT_ELARA_PORTRAIT } from '../constants/defaultPortrait';
import {
  X,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Sliders,
  User,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Maximize2,
  SlidersHorizontal,
  Type,
  Palette,
  Brain,
  Zap,
  Key,
  Globe,
  ExternalLink,
  Calendar,
  CheckSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Mic,
  Volume2,
  Table,
  Users,
  Bookmark,
  Mail,
  Send,
  Inbox,
  MessageSquare,
  Bot,
  Radio,
  BellRing,
  Share2,
  Copy,
  Save,
  HelpCircle,
  Info,
  Edit3,
  Clock,
} from 'lucide-react';
import {
  getTasks,
  requestGoogleAuth,
  isGoogleConnected,
  createGoogleDoc,
  editGoogleDoc,
  getGoogleDoc,
  searchGoogleDriveDocs,
  GoogleDocSummary,
  searchContacts,
  searchKeepNotes,
  createKeepNote,
  updateKeepNote,
  getKeepNote,
  deleteKeepNote,
  listKeepNotes,
  createGoogleSheet,
  listGmailMessages,
  sendGmailMessage,
  createGmailDraft,
  listChatSpaces,
  createChatSpace,
  listChatMessages,
  sendChatMessage,
  sendChatCardMessage,
  postChatWebhook,
  buildTaskApprovalCard,
  buildDraftPreviewCard,
  buildScheduleSweepCard,
  buildSystemAlertCard,
  loadSpaceWebhooks,
  saveSpaceWebhooks,
  TaskItem,
  ContactPerson,
  KeepNoteItem,
  GmailMessageSummary,
  ChatSpace,
  ChatMessageResult,
  SpaceWebhookConfig,
} from '../lib/googleApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ElaraSettings;
  onSaveSettings: (newSettings: ElaraSettings) => void;
  customPortrait: string | null;
  onUploadPortrait: (base64Img: string) => void;
  onRemovePortrait: () => void;
  onExportAllData: () => void;
  onImportData: (jsonStr: string) => void;
  onClearAllData: () => void;
}

import { loadRateLimits } from '../lib/storage';
import { googleCalendarContract } from '../contracts/implementations';
import type { GoogleCalendarEvent } from '../contracts';
import { VoiceChatSettingsPanel } from './VoiceChatSettingsPanel';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  customPortrait,
  onUploadPortrait,
  onRemovePortrait,
  onExportAllData,
  onImportData,
  onClearAllData,
}) => {
  const [formData, setFormData] = useState<ElaraSettings>(settings);
  const [snapshots, setSnapshots] = useState<PersonaSnapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSnapshotPrompt, setShowSnapshotPrompt] = useState(false);

  useEffect(() => {
    getDbSnapshots().then(setSnapshots);
  }, []);

  const handleSaveSnapshot = async () => {
    if (!snapshotName.trim()) return;
    const newSnapshot: PersonaSnapshot = {
      id: `snap_${Date.now()}`,
      name: snapshotName.trim(),
      timestamp: Date.now(),
      systemPrompt: formData.systemPrompt,
      personaProtocol: formData.personaProtocol,
      intimacyModule: formData.intimacyModule,
      runtimeRules: formData.runtimeRules
    };
    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    await setDbSnapshots(updated);
    setSnapshotName('');
    setShowSnapshotPrompt(false);
  };

  const handleLoadSnapshot = (snap: PersonaSnapshot) => {
    setFormData({
      ...formData,
      systemPrompt: snap.systemPrompt,
      personaProtocol: snap.personaProtocol,
      intimacyModule: snap.intimacyModule,
      runtimeRules: snap.runtimeRules
    });
  };

  const handleDeleteSnapshot = async (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    await setDbSnapshots(updated);
  };

  const [activeTab, setActiveTab] = useState<'persona' | 'visuals' | 'voice' | 'workspace' | 'system' | 'data'>('visuals');
  const [showPromptResetConfirm, setShowPromptResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Workspace Sync State
  const [isGoogleAuthed, setIsGoogleAuthed] = useState(isGoogleConnected());
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [calendarSyncResult, setCalendarSyncResult] = useState<{ count: number; timestamp: string; events: GoogleCalendarEvent[] } | null>(null);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);

  const [isTasksSyncing, setIsTasksSyncing] = useState(false);
  const [tasksSyncResult, setTasksSyncResult] = useState<{ count: number; listTitle: string; timestamp: string; tasks: TaskItem[] } | null>(null);
  const [tasksSyncError, setTasksSyncError] = useState<string | null>(null);

  const [isDocsExporting, setIsDocsExporting] = useState(false);
  const [docsExportUrl, setDocsExportUrl] = useState<string | null>(null);
  const [docsExportError, setDocsExportError] = useState<string | null>(null);

  // Sheets Sync State
  const [isSheetsCreating, setIsSheetsCreating] = useState(false);
  const [sheetsResultUrl, setSheetsResultUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Contacts Sync State
  const [isContactsSyncing, setIsContactsSyncing] = useState(false);
  const [contactsResult, setContactsResult] = useState<{ count: number; timestamp: string; contacts: ContactPerson[] } | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // Keep Notes Archive State
  const [keepNotesList, setKeepNotesList] = useState<KeepNoteItem[]>([]);
  const [isKeepLoading, setIsKeepLoading] = useState(false);
  const [newKeepTitle, setNewKeepTitle] = useState('');
  const [newKeepContent, setNewKeepContent] = useState('');
  const [keepSearchQuery, setKeepSearchQuery] = useState('');
  const [editingKeepId, setEditingKeepId] = useState<string | null>(null);
  const [editingKeepTitle, setEditingKeepTitle] = useState('');
  const [editingKeepContent, setEditingKeepContent] = useState('');
  const [keepActionNotice, setKeepActionNotice] = useState<string | null>(null);

  // Google Drive Docs State & Browser
  const [driveDocsList, setDriveDocsList] = useState<GoogleDocSummary[]>([]);
  const [isDriveDocsLoading, setIsDriveDocsLoading] = useState(false);
  const [driveDocsError, setDriveDocsError] = useState<string | null>(null);
  const [driveDocsQuery, setDriveDocsQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocData, setSelectedDocData] = useState<{ documentId: string; title: string; content: string; url: string } | null>(null);
  const [isLoadingDocContent, setIsLoadingDocContent] = useState(false);
  const [docAppendText, setDocAppendText] = useState('');
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);
  const [docUpdateNotice, setDocUpdateNotice] = useState<string | null>(null);

  // Gmail Inbox & Messaging State
  const [isGmailSyncing, setIsGmailSyncing] = useState(false);
  const [gmailResult, setGmailResult] = useState<{ count: number; timestamp: string; messages: GmailMessageSummary[] } | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('');
  const [testEmailBody, setTestEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailStatus, setSendEmailStatus] = useState<string | null>(null);

  // Google Chat & Webhooks State
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [isChatSpacesLoading, setIsChatSpacesLoading] = useState(false);
  const [chatSpacesError, setChatSpacesError] = useState<string | null>(null);
  const [newSpaceDisplayName, setNewSpaceDisplayName] = useState('');
  const [newSpaceType, setNewSpaceType] = useState<'SPACE' | 'GROUP_CHAT'>('SPACE');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [createSpaceStatus, setCreateSpaceStatus] = useState<string | null>(null);
  const [spaceMessages, setSpaceMessages] = useState<ChatMessageResult[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesSpaceName, setMessagesSpaceName] = useState<string | null>(null);
  const [spaceWebhooks, setSpaceWebhooks] = useState<SpaceWebhookConfig[]>([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookSpaceId, setNewWebhookSpaceId] = useState('');
  const [newWebhookAutoDaily, setNewWebhookAutoDaily] = useState(true);
  const [newWebhookAutoTasks, setNewWebhookAutoTasks] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [testMessageText, setTestMessageText] = useState('Hello from Elara Workspace Engine!');
  const [testCardType, setTestCardType] = useState<'text' | 'task_approval' | 'draft_preview' | 'schedule_sweep' | 'system_alert'>('text');
  const [isDispatchingChat, setIsDispatchingChat] = useState(false);
  const [chatDispatchStatus, setChatDispatchStatus] = useState<string | null>(null);
  const [showChatTroubleshooting, setShowChatTroubleshooting] = useState(false);
  const [isProactivePushing, setIsProactivePushing] = useState(false);
  const [proactivePushStatus, setProactivePushStatus] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  
  const [rateLimits, setRateLimits] = useState<{ date: string; counts: Record<string, number> }>({ date: '', counts: {} });

  React.useEffect(() => {
    if (isOpen) {
      setRateLimits(loadRateLimits());
      setIsGoogleAuthed(isGoogleConnected());
      const loadedHooks = loadSpaceWebhooks();
      setSpaceWebhooks(loadedHooks);
      if (loadedHooks.length > 0 && !selectedTarget) {
        setSelectedTarget(loadedHooks[0].webhookUrl);
      }
    }
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activePortraitImage = customPortrait || DEFAULT_ELARA_PORTRAIT;

  const handleResetPrompt = () => {
    setFormData((prev) => ({
      ...prev,
      systemPrompt: DEFAULT_ELARA_SYSTEM_PROMPT,
      personaProtocol: DEFAULT_PERSONA_PROTOCOL,
      intimacyModule: DEFAULT_INTIMACY_MODULE,
      runtimeRules: DEFAULT_RUNTIME_RULES,
    }));
    setShowPromptResetConfirm(false);
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  const handleConnectGoogle = async () => {
    try {
      await requestGoogleAuth(true);
      setIsGoogleAuthed(true);
    } catch (err: any) {
      console.error('Google Auth error:', err);
    }
  };

  const handleManualCalendarSync = async () => {
    setIsCalendarSyncing(true);
    setCalendarSyncError(null);
    try {
      const data = await googleCalendarContract.getUpcoming(15);
      setCalendarSyncResult({
        count: data.items.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        events: data.items,
      });
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setCalendarSyncError(err.message || 'Failed to sync calendar');
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  const handleManualTasksSync = async () => {
    setIsTasksSyncing(true);
    setTasksSyncError(null);
    try {
      const data = await getTasks();
      setTasksSyncResult({
        count: data.items.length,
        listTitle: data.listTitle || 'My Tasks',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tasks: data.items,
      });
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setTasksSyncError(err.message || 'Failed to sync tasks');
    } finally {
      setIsTasksSyncing(false);
    }
  };

  const handleManualDocsExport = async () => {
    setIsDocsExporting(true);
    setDocsExportError(null);
    try {
      const title = `Elara Companion Export - ${new Date().toLocaleDateString()}`;
      const content = `# ${title}\n\n## System Instructions\n${formData.systemPrompt}\n\n## Persona Protocol\n${formData.personaProtocol}\n\n## Runtime Rules\n${formData.runtimeRules}\n`;
      const res = await createGoogleDoc(title, content);
      setDocsExportUrl(res.url);
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setDocsExportError(err.message || 'Failed to export to Google Docs');
    } finally {
      setIsDocsExporting(false);
    }
  };

  const handleManualSheetsCreate = async () => {
    setIsSheetsCreating(true);
    setSheetsError(null);
    try {
      const title = `Elara Structured Log - ${new Date().toLocaleDateString()}`;
      const headers = ['Timestamp', 'Category', 'Description', 'Notes', 'LoggedBy'];
      const sheet = await createGoogleSheet(title, headers);
      setSheetsResultUrl(sheet.spreadsheetUrl);
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setSheetsError(err.message || 'Failed to create Google Spreadsheet');
    } finally {
      setIsSheetsCreating(false);
    }
  };

  const handleManualContactsSync = async () => {
    setIsContactsSyncing(true);
    setContactsError(null);
    try {
      const res = await searchContacts('', 25);
      setContactsResult({
        count: res.contacts.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contacts: res.contacts,
      });
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setContactsError(err.message || 'Failed to fetch Google Contacts');
    } finally {
      setIsContactsSyncing(false);
    }
  };

  const handleLoadKeepNotes = async (query = '') => {
    setIsKeepLoading(true);
    try {
      const res = await searchKeepNotes(query);
      setKeepNotesList(res.notes);
    } catch (err) {
      console.warn('Failed to load Keep notes:', err);
    } finally {
      setIsKeepLoading(false);
    }
  };

  const handleCreateKeepNote = async () => {
    if (!newKeepTitle.trim() && !newKeepContent.trim()) return;
    try {
      const note = await createKeepNote(newKeepTitle.trim() || 'Archive Note', newKeepContent.trim(), ['Archive', 'Reference']);
      setKeepNotesList((prev) => [note, ...prev]);
      setNewKeepTitle('');
      setNewKeepContent('');
    } catch (err) {
      console.warn('Failed to create keep note:', err);
    }
  };

  const handleStartEditKeepNote = (note: KeepNoteItem) => {
    setEditingKeepId(note.id);
    setEditingKeepTitle(note.title);
    setEditingKeepContent(note.content);
    setKeepActionNotice(null);
  };

  const handleSaveEditKeepNote = async () => {
    if (!editingKeepId) return;
    try {
      const updated = await updateKeepNote(editingKeepId, {
        title: editingKeepTitle.trim() || 'Untitled Note',
        content: editingKeepContent.trim(),
      });
      if (updated) {
        setKeepNotesList((prev) => prev.map((n) => (n.id === editingKeepId ? updated : n)));
        setKeepActionNotice('✓ Note updated successfully!');
        setTimeout(() => setKeepActionNotice(null), 3000);
      }
      setEditingKeepId(null);
      setEditingKeepTitle('');
      setEditingKeepContent('');
    } catch (err: any) {
      console.warn('Failed to update keep note:', err);
      setKeepActionNotice('❌ Error: ' + (err.message || 'Failed to update note'));
    }
  };

  const handleExportKeepNoteToDocs = async (note: KeepNoteItem) => {
    try {
      setKeepActionNotice(`Exporting "${note.title}" to Google Docs...`);
      const res = await createGoogleDoc(`[Keep Note] ${note.title}`, note.content);
      await updateKeepNote(note.id, { url: res.url });
      setKeepNotesList((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, url: res.url } : n))
      );
      setKeepActionNotice(`✓ Exported to Google Docs!`);
      window.open(res.url, '_blank');
      setTimeout(() => setKeepActionNotice(null), 4000);
    } catch (err: any) {
      console.warn('Failed to export note to docs:', err);
      setKeepActionNotice('❌ Export error: ' + (err.message || 'Failed to export note'));
    }
  };

  // Google Drive Docs Handlers
  const handleSearchDriveDocs = async (query = '') => {
    setIsDriveDocsLoading(true);
    setDriveDocsError(null);
    try {
      const res = await searchGoogleDriveDocs(query, 12);
      setDriveDocsList(res.docs);
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setDriveDocsError(err.message || 'Failed to load Google Docs from Drive');
    } finally {
      setIsDriveDocsLoading(false);
    }
  };

  const handleSelectAndReadDoc = async (documentId: string) => {
    setSelectedDocId(documentId);
    setIsLoadingDocContent(true);
    setDocUpdateNotice(null);
    try {
      const doc = await getGoogleDoc(documentId);
      setSelectedDocData(doc);
    } catch (err: any) {
      console.warn('Failed to read doc:', err);
      setDocUpdateNotice('❌ Error reading document: ' + (err.message || 'Failed to load doc'));
    } finally {
      setIsLoadingDocContent(false);
    }
  };

  const handleAppendOrEditDoc = async (mode: 'append' | 'replace' = 'append') => {
    if (!selectedDocId || !docAppendText.trim()) return;
    setIsUpdatingDoc(true);
    setDocUpdateNotice(null);
    try {
      await editGoogleDoc(selectedDocId, docAppendText.trim(), mode);
      setDocUpdateNotice(`✓ Successfully ${mode === 'append' ? 'appended to' : 'updated'} document!`);
      setDocAppendText('');
      // Reload updated content
      const updatedDoc = await getGoogleDoc(selectedDocId);
      setSelectedDocData(updatedDoc);
      setTimeout(() => setDocUpdateNotice(null), 4000);
    } catch (err: any) {
      console.warn('Failed to update doc:', err);
      setDocUpdateNotice('❌ Error updating doc: ' + (err.message || 'Failed to update document'));
    } finally {
      setIsUpdatingDoc(false);
    }
  };

  const handleDeleteKeepNoteItem = async (id: string) => {
    try {
      await deleteKeepNote(id);
      setKeepNotesList((prev) => prev.filter((n) => n.id !== id));
      setKeepActionNotice('✓ Note removed from archive');
      setTimeout(() => setKeepActionNotice(null), 2500);
    } catch (err) {
      console.warn('Failed to delete keep note:', err);
    }
  };

  const handleCreateChatSpace = async () => {
    if (!newSpaceDisplayName.trim()) return;
    setIsCreatingSpace(true);
    setCreateSpaceStatus(null);
    try {
      const created = await createChatSpace(newSpaceDisplayName.trim(), newSpaceType);
      setChatSpaces((prev) => [created, ...prev]);
      setSelectedTarget(created.name);
      setCreateSpaceStatus(`✓ Created Space: "${created.displayName}"`);
      setNewSpaceDisplayName('');
      setTimeout(() => setCreateSpaceStatus(null), 4000);
    } catch (err: any) {
      setCreateSpaceStatus('❌ Error: ' + (err.message || 'Failed to create space'));
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const handleLoadSpaceMessages = async (spaceName: string) => {
    if (!spaceName) return;
    setIsLoadingMessages(true);
    setMessagesSpaceName(spaceName);
    try {
      const res = await listChatMessages(spaceName, 20);
      setSpaceMessages(res.messages);
    } catch (err: any) {
      console.warn('Failed to fetch space messages:', err);
      setSpaceMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleManualGmailSync = async () => {
    setIsGmailSyncing(true);
    setGmailError(null);
    try {
      const res = await listGmailMessages('', 15);
      setGmailResult({
        count: res.messages.length,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: res.messages,
      });
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setGmailError(err.message || 'Failed to sync Gmail inbox');
    } finally {
      setIsGmailSyncing(false);
    }
  };

  const handleSendQuickEmail = async () => {
    if (!testEmailTo.trim() || !testEmailSubject.trim() || !testEmailBody.trim()) return;
    setIsSendingEmail(true);
    setSendEmailStatus(null);
    try {
      await sendGmailMessage(testEmailTo.trim(), testEmailSubject.trim(), testEmailBody.trim());
      setSendEmailStatus('✓ Email sent successfully!');
      setTestEmailTo('');
      setTestEmailSubject('');
      setTestEmailBody('');
      setIsGoogleAuthed(true);
      setTimeout(() => setSendEmailStatus(null), 4000);
    } catch (err: any) {
      setSendEmailStatus('❌ Error: ' + (err.message || 'Failed to send email'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCreateQuickDraft = async () => {
    if (!testEmailTo.trim() || !testEmailSubject.trim() || !testEmailBody.trim()) return;
    setIsSendingEmail(true);
    setSendEmailStatus(null);
    try {
      await createGmailDraft(testEmailTo.trim(), testEmailSubject.trim(), testEmailBody.trim());
      setSendEmailStatus('✓ Draft saved to your Gmail drafts!');
      setTestEmailTo('');
      setTestEmailSubject('');
      setTestEmailBody('');
      setIsGoogleAuthed(true);
      setTimeout(() => setSendEmailStatus(null), 4000);
    } catch (err: any) {
      setSendEmailStatus('❌ Error: ' + (err.message || 'Failed to create draft'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Google Chat & Webhook Handlers
  const handleScanChatSpaces = async () => {
    setIsChatSpacesLoading(true);
    setChatSpacesError(null);
    try {
      const res = await listChatSpaces(30);
      setChatSpaces(res.spaces);
      if (res.spaces.length > 0 && !selectedTarget) {
        setSelectedTarget(res.spaces[0].name);
      }
      setIsGoogleAuthed(true);
    } catch (err: any) {
      setChatSpacesError(err.message || 'Failed to list Google Chat spaces');
    } finally {
      setIsChatSpacesLoading(false);
    }
  };

  const handleSaveWebhookConfig = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    const cleanSpaceId = newWebhookSpaceId.trim() || newWebhookName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newConfig: SpaceWebhookConfig = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      spaceId: cleanSpaceId,
      name: newWebhookName.trim(),
      webhookUrl: newWebhookUrl.trim(),
      autoDailySummary: newWebhookAutoDaily,
      autoTaskAlerts: newWebhookAutoTasks,
    };

    const updated = [newConfig, ...spaceWebhooks.filter((w) => w.spaceId !== cleanSpaceId)];
    setSpaceWebhooks(updated);
    saveSpaceWebhooks(updated);

    // Sync with backend router
    try {
      await fetch('/api/chat/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (e) {
      console.warn('Backend webhook sync notice:', e);
    }

    setNewWebhookName('');
    setNewWebhookUrl('');
    setNewWebhookSpaceId('');
  };

  const handleDeleteWebhookConfig = async (id: string) => {
    const updated = spaceWebhooks.filter((w) => w.id !== id && w.spaceId !== id);
    setSpaceWebhooks(updated);
    saveSpaceWebhooks(updated);
    try {
      await fetch(`/api/chat/webhooks/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend webhook delete notice:', e);
    }
  };

  const handleDispatchTestChat = async () => {
    if (!selectedTarget) return;
    setIsDispatchingChat(true);
    setChatDispatchStatus(null);
    try {
      const isWebhook = selectedTarget.startsWith('http');
      let cardPayload: any = null;

      if (testCardType === 'task_approval') {
        cardPayload = buildTaskApprovalCard('Consolidate Workspace Logs', 'task_ui_1', 'Review and merge background tasks into Google Docs');
      } else if (testCardType === 'draft_preview') {
        cardPayload = buildDraftPreviewCard('Weekly Briefing Draft', 'Draft email prepared for team review with action item breakdown.', 'https://mail.google.com', 'gmail');
      } else if (testCardType === 'schedule_sweep') {
        const events = await googleCalendarContract.getUpcoming(5);
        cardPayload = buildScheduleSweepCard(
          events.items.map((e) => ({
            summary: e.summary,
            time: e.start.dateTime || e.start.date || 'TBD',
            location: e.location,
          }))
        );
      } else if (testCardType === 'system_alert') {
        cardPayload = buildSystemAlertCard('Elara Dual-Mode Router Status', 'Google Chat API and Space Webhook endpoints active and operational.', 'info');
      }

      if (isWebhook) {
        if (testCardType === 'text') {
          await postChatWebhook(selectedTarget, { text: testMessageText });
        } else {
          await postChatWebhook(selectedTarget, { cardsV2: [cardPayload] });
        }
      } else {
        if (testCardType === 'text') {
          await sendChatMessage(selectedTarget, testMessageText);
        } else {
          await sendChatCardMessage(selectedTarget, [cardPayload], testMessageText || 'Elara Interactive Card');
        }
      }

      setChatDispatchStatus('✓ Dispatched successfully to Google Chat!');
      setTimeout(() => setChatDispatchStatus(null), 4000);
    } catch (err: any) {
      setChatDispatchStatus('❌ Error: ' + (err.message || 'Dispatch failed'));
    } finally {
      setIsDispatchingChat(false);
    }
  };

  const handleProactivePushTrigger = async (type: 'morning_sweep' | 'task_summary' | 'system_alert') => {
    setIsProactivePushing(true);
    setProactivePushStatus(null);
    try {
      const res = await fetch('/api/chat/proactive/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          customTitle: type === 'morning_sweep' ? '🌅 Morning Schedule Sweep' : type === 'task_summary' ? '⚡ Background Task Status' : '🛡️ Elara System Briefing',
          customMessage: `Autonomous proactive notification triggered at ${new Date().toLocaleTimeString()}.`,
        }),
      });
      const data = await res.json();
      setProactivePushStatus(`✓ Push delivered to ${data.dispatchedCount || 0} registered webhook space(s)!`);
      setTimeout(() => setProactivePushStatus(null), 4000);
    } catch (err: any) {
      setProactivePushStatus('❌ Push failed: ' + (err.message || 'Network error'));
    } finally {
      setIsProactivePushing(false);
    }
  };

  const handleCopyInboundEndpoint = () => {
    const fullUrl = `${window.location.origin}/api/google-chat/event`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          onImportData(content);
          setImportStatus('Data imported successfully!');
          setTimeout(() => setImportStatus(null), 3000);
        } catch (err: any) {
          setImportStatus('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePortraitFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadPortrait(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBackdropFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 12MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({
          ...prev,
          backdropImage: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={portraitFileInputRef}
        onChange={handlePortraitFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={backdropFileInputRef}
        onChange={handleBackdropFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />

      <div className="bg-[#121212] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Elara Settings & Appearance</h2>
              <p className="text-xs text-zinc-400">Character portrait, chat backdrop & model customization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-6 pt-2 gap-2 text-xs font-medium overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('visuals')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'visuals'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Portrait & Backdrop</span>
          </button>
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'persona'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Model & User</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'voice'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice & Speech</span>
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'workspace'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Google Workspace & Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'system'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>System Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-2 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'data'
                ? 'border-sky-500 text-sky-400 bg-zinc-900/80 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Data Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-200 leading-relaxed font-sans custom-scrollbar">
          {/* TAB 1: PORTRAIT & BACKDROP VISUALS */}
          {activeTab === 'visuals' && (
            <div className="space-y-6">
              {/* Character Portrait Upload & Scale Section */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-sky-400" />
                      <span>Elara Character Portrait</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Upload a custom 4:5 portrait image for Elara and adjust her display size scale.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Thumbnail Preview Box */}
                  <div className="flex flex-col items-center justify-center sm:border-r border-zinc-800/80 pr-0 sm:pr-4 min-h-[160px]">
                    <div
                      style={{
                        width: `${Math.round(112 * Math.min(formData.portraitScale ?? 1.0, 1.8))}px`,
                      }}
                      className="relative aspect-[4/5] rounded-xl overflow-hidden bg-zinc-950 border border-sky-500/30 shadow-md flex items-center justify-center transition-all duration-150"
                    >
                      <img
                        src={activePortraitImage}
                        alt="Portrait Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                      Panel Frame Scale ({(formData.portraitScale ?? 1.0).toFixed(1)}x)
                    </span>
                  </div>

                  {/* Upload Controls & Scale Slider */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => portraitFileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-900/30 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{customPortrait ? 'Replace Portrait' : 'Upload Portrait Image'}</span>
                      </button>

                      {customPortrait && (
                        <button
                          type="button"
                          onClick={onRemovePortrait}
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-red-950/50 text-zinc-300 hover:text-red-300 border border-zinc-700/60 text-xs transition-colors"
                          title="Reset to default portrait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Portrait Multiplier Scale Slider */}
                    <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label className="font-medium text-zinc-300">Portrait Size Scale</label>
                        <span className="font-mono text-sky-400 font-semibold text-xs">
                          {(formData.portraitScale ?? 1.0).toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={formData.portraitScale ?? 1.0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            portraitScale: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>0.5x</span>
                        <span>1.0x (Default)</span>
                        <span>2.0x</span>
                        <span>3.0x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography & Font Size Customization */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Type className="w-4 h-4 text-sky-400" />
                      <span>Dialogue Typography & Font Size</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Adjust the reading font size of dialogue and messages across the chat.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Live Font Preview Box */}
                  <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-center min-h-[90px]">
                    <span className="text-[10px] text-zinc-500 font-mono mb-1">Live Font Preview ({formData.fontSize ?? 14}px)</span>
                    <p
                      style={{ fontSize: `${formData.fontSize ?? 14}px` }}
                      className="text-zinc-200 leading-relaxed transition-all font-sans"
                    >
                      "Good evening. I'm right here beside you whenever you're ready."
                    </p>
                  </div>

                  {/* Font Size Slider */}
                  <div className="sm:col-span-2 space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-medium text-zinc-300">Message Text Size</label>
                      <span className="font-mono text-sky-400 font-semibold text-xs">
                        {formData.fontSize ?? 14} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      step="1"
                      value={formData.fontSize ?? 14}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fontSize: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>10px (Compact)</span>
                      <span>14px (Default)</span>
                      <span>17px</span>
                      <span>20px (Large)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text & Message Background Palette */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-sky-400" />
                      <span>Text & Message Bubble Background</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Choose the ambient color scheme and surface styling for dialogue cards and user bubbles.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'slate',
                      name: 'Obsidian Slate (Default)',
                      desc: 'Balanced dark graphite with subtle borders',
                      bgClass: 'bg-zinc-900 border-zinc-800 text-zinc-200',
                      chip: 'bg-zinc-800',
                    },
                    {
                      id: 'deep-onyx',
                      name: 'Deep Onyx Pitch',
                      desc: 'Pure deep black canvas with minimal contrast',
                      bgClass: 'bg-black border-zinc-900 text-zinc-100',
                      chip: 'bg-black border border-zinc-700',
                    },
                    {
                      id: 'midnight-blue',
                      name: 'Midnight Sapphire',
                      desc: 'Deep oceanic navy with subtle azure undertones',
                      bgClass: 'bg-[#080f20] border-sky-900/60 text-sky-100',
                      chip: 'bg-[#080f20] border border-sky-600',
                    },
                    {
                      id: 'cyber-violet',
                      name: 'Cyberpunk Amethyst',
                      desc: 'Dark obsidian violet with neon purple accents',
                      bgClass: 'bg-[#120824] border-purple-900/60 text-purple-100',
                      chip: 'bg-[#120824] border border-purple-600',
                    },
                    {
                      id: 'emerald-terminal',
                      name: 'Emerald Matrix',
                      desc: 'Dark cybernetic emerald green terminal tones',
                      bgClass: 'bg-[#05140d] border-emerald-900/60 text-emerald-100',
                      chip: 'bg-[#05140d] border border-emerald-600',
                    },
                    {
                      id: 'frosted-glass',
                      name: 'Frosted Glass Blur',
                      desc: 'Translucent acrylic glass with delicate edge borders',
                      bgClass: 'bg-zinc-900/50 backdrop-blur-md border-white/10 text-zinc-100',
                      chip: 'bg-zinc-800/60 border border-white/20',
                    },
                    {
                      id: 'high-contrast',
                      name: 'High Contrast Slate',
                      desc: 'Crisp distinct borders for maximum readability',
                      bgClass: 'bg-zinc-900 border-2 border-zinc-600 text-white',
                      chip: 'bg-zinc-900 border-2 border-zinc-400',
                    },
                  ].map((themeOpt) => {
                    const isSelected = (formData.textBackground || 'slate') === themeOpt.id;
                    return (
                      <div
                        key={themeOpt.id}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            textBackground: themeOpt.id as any,
                          })
                        }
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'ring-2 ring-sky-500 bg-sky-950/30 border-sky-500/80 shadow-md'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg shrink-0 mt-0.5 shadow-sm ${themeOpt.chip}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-200">{themeOpt.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{themeOpt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Backdrop Screen Section */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                      <span>Chat Backdrop Screen</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Set a custom background image for the main chat workspace behind dialogue.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Backdrop Preview & Upload Row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <div className="w-16 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0 flex items-center justify-center">
                        {formData.backdropImage ? (
                          <img
                            src={formData.backdropImage}
                            alt="Backdrop Preview"
                            className="w-full h-full object-cover"
                            style={{
                              opacity: formData.backdropOpacity ?? 0.3,
                              filter: `blur(${(formData.backdropBlur ?? 4) / 2}px)`,
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">None</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200">
                          {formData.backdropImage ? 'Custom Chat Backdrop Active' : 'No Backdrop Image Set'}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {formData.backdropImage
                            ? 'Rendered behind conversation feed'
                            : 'Upload a cozy room, ambient scenery, or wallpaper'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => backdropFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-all shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>{formData.backdropImage ? 'Change Image' : 'Upload Backdrop'}</span>
                      </button>

                      {formData.backdropImage && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, backdropImage: null })}
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-700/60 transition-colors"
                          title="Remove Backdrop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sliders for Opacity and Blur */}
                  {formData.backdropImage && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <label className="font-medium text-zinc-300">Backdrop Opacity</label>
                          <span className="font-mono text-sky-400 font-semibold text-xs">
                            {Math.round((formData.backdropOpacity ?? 0.3) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1.0"
                          step="0.05"
                          value={formData.backdropOpacity ?? 0.3}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              backdropOpacity: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <label className="font-medium text-zinc-300">Backdrop Blur</label>
                          <span className="font-mono text-sky-400 font-semibold text-xs">
                            {formData.backdropBlur ?? 4}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="1"
                          value={formData.backdropBlur ?? 4}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              backdropBlur: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard & Composer Input Controls */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span>Keyboard & Mobile Input Controls</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Configure message dispatch behavior for touch keyboards and physical input.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-medium text-zinc-200">Send message on Enter key</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      When turned off (recommended for mobile keyboards), pressing Enter creates a newline, and messages are sent using the Send button or Ctrl/Cmd+Enter.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, sendOnEnter: !formData.sendOnEnter })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.sendOnEnter ? 'bg-sky-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.sendOnEnter ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL & USER */}
          {activeTab === 'persona' && (
            <div className="space-y-5">

              {/* Persona Snapshots */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Persona Snapshots</h3>
                  <button
                    type="button"
                    onClick={() => setShowSnapshotPrompt(!showSnapshotPrompt)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Snapshot
                  </button>
                </div>
                
                {showSnapshotPrompt && (
                  <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="text"
                      value={snapshotName}
                      onChange={(e) => setSnapshotName(e.target.value)}
                      placeholder="e.g., Strict Tutor, Flirty, Default"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveSnapshot}
                      disabled={!snapshotName.trim()}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Save
                    </button>
                  </div>
                )}

                {snapshots.length > 0 ? (
                  <div className="space-y-2">
                    {snapshots.map(snap => (
                      <div key={snap.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/50">
                        <div>
                          <p className="text-xs font-medium text-zinc-200">{snap.name}</p>
                          <p className="text-[10px] text-zinc-500">{new Date(snap.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadSnapshot(snap)}
                            className="px-2 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No snapshots saved yet. Save a snapshot to easily switch between persona configurations.</p>
                )}
              </div>

              {/* User Name & Timezone Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    User Name (replaces [[user]])
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      placeholder="e.g. Alex"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    World Timezone
                  </label>
                  <select
                    value={formData.timezone || 'Africa/Johannesburg'}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2) [Default]</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>
              </div>

              {/* Gemini API Key Configuration (Required for GitHub Pages / Static hosting) */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>Gemini API Key (GitHub Pages & Client Mode)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Required when hosting as a static GitHub Page without a backend server.
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[11px] hover:bg-sky-900 transition-colors"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="password"
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="AIzaSy... (Leave empty to use backend server if deployed to Vercel/Cloud Run)"
                      className="w-full pl-3 pr-20 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-sky-500"
                    />
                    {formData.apiKey && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, apiKey: '' })}
                        className="absolute right-2 top-2 px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    🔒 <strong>Privacy:</strong> Your key is stored solely in your browser's private <code className="font-mono text-zinc-400">localStorage</code>. When hosting on GitHub Pages, requests go directly to Google Gemini API over HTTPS.
                  </p>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Gemini Model
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = formData.model === m.id;
                    const count = rateLimits.counts[m.id] || 0;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setFormData({ ...formData, model: m.id })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/30'
                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-100 text-xs sm:text-sm">{m.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                              {count} calls today
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{m.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature & Output Length Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Temperature</label>
                    <span className="text-xs font-mono text-sky-400">{formData.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Higher values yield more creative roleplay dialogue.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Max Output Tokens</label>
                    <span className="text-xs font-mono text-sky-400">{formData.maxOutputTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={formData.maxOutputTokens}
                    onChange={(e) =>
                      setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">Allows substantial long-form roleplay responses.</p>
                </div>
              </div>

              {/* LLM Thinking & Reasoning Effort Slider */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-sky-400" />
                      <span>LLM Thinking Effort & Reasoning Budget</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Controls Gemini 2.5 / 3.7 internal reasoning tokens before generating output.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono text-xs font-semibold">
                    {formData.thinkingBudget === 0
                      ? '0 (Off)'
                      : `${(formData.thinkingBudget ?? 4096).toLocaleString()} Tokens`}
                  </span>
                </div>

                {/* Slider */}
                <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  <input
                    type="range"
                    min="0"
                    max="16384"
                    step="512"
                    value={formData.thinkingBudget ?? 4096}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thinkingBudget: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0 (Off)</span>
                    <span>2k (Fast)</span>
                    <span>4k (Standard)</span>
                    <span>8k (Deep)</span>
                    <span>16k (Max)</span>
                  </div>
                </div>

                {/* Dynamic Status / Description Card */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start gap-2.5 text-xs">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-zinc-300 leading-relaxed">
                    {(formData.thinkingBudget ?? 4096) === 0 && (
                      <span>
                        <strong className="text-zinc-100">Thinking Disabled:</strong> Fastest possible response speed. Instant generation without internal thinking scratchpad.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 0 && (formData.thinkingBudget ?? 4096) <= 2048 && (
                      <span>
                        <strong className="text-zinc-100">Light / Fast Thinking:</strong> Quick reasoning for conversational flow while verifying tone and safety filters.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 2048 && (formData.thinkingBudget ?? 4096) <= 6144 && (
                      <span>
                        <strong className="text-zinc-100">Deep Reasoning (Recommended):</strong> Balances rich character immersion, complex narrative memory, and responsive streaming.
                      </span>
                    )}
                    {(formData.thinkingBudget ?? 4096) > 6144 && (
                      <span>
                        <strong className="text-zinc-100">Exhaustive High-Effort Thinking:</strong> Maximum reasoning tokens allocated for deep analysis, intricate plotlines, and nuanced writing.
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset Quick Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Off (0)', val: 0 },
                    { label: 'Light (1,024)', val: 1024 },
                    { label: 'Balanced (2,048)', val: 2048 },
                    { label: 'Deep (4,096)', val: 4096 },
                    { label: 'Thorough (8,192)', val: 8192 },
                    { label: 'Maximum (16,384)', val: 16384 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, thinkingBudget: preset.val })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                        (formData.thinkingBudget ?? 4096) === preset.val
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Toggle */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div>
                  <p className="text-xs font-medium text-zinc-200">Include Conversation History</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Pass previous dialogue messages to Gemini for context continuity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, includeHistory: !formData.includeHistory })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.includeHistory ? 'bg-sky-600' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.includeHistory ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB: VOICE & SPEECH-TO-TEXT */}
          {activeTab === 'voice' && (
            <VoiceChatSettingsPanel
              settings={formData}
              onChange={setFormData}
            />
          )}

          {/* TAB: GOOGLE WORKSPACE & SYNC */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              {/* Account Connection Status Banner */}
              <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Google Workspace Integration
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        OAuth connection for Google Calendar, Google Tasks & Google Docs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGoogleAuthed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-[11px] font-medium text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-800/40 text-[11px] font-medium text-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        Auth Required
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isGoogleAuthed ? 'Re-Authorize' : 'Connect Account'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/30 text-[11px] text-sky-200/90 leading-relaxed">
                  💡 <strong>Autonomous Background Sync:</strong> Elara reads, writes, drafts, and syncs Gmail emails, calendar, tasks, contacts, and sheets autonomously in the background when prompted. No raw JSON is displayed in chat.
                </div>
              </div>

              {/* 1. Gmail Inbox & Composing */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-red-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Gmail</h4>
                      <p className="text-[11px] text-zinc-400">Read inbox messages, draft responses, and send emails</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualGmailSync}
                    disabled={isGmailSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGmailSyncing ? 'animate-spin' : ''}`} />
                    <span>{isGmailSyncing ? 'Syncing...' : 'Sync Inbox Now'}</span>
                  </button>
                </div>

                {gmailError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{gmailError}</span>
                  </div>
                )}

                {gmailResult && (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                        <span>
                          {gmailResult.count === 0
                            ? 'No recent emails found in inbox.'
                            : `✓ Synced ${gmailResult.count} recent ${
                                gmailResult.count === 1 ? 'email' : 'emails'
                              }`}
                        </span>
                      </div>
                      <span className="text-[10px] text-red-400/80 font-mono">
                        Last synced: {gmailResult.timestamp}
                      </span>
                    </div>

                    {gmailResult.messages.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {gmailResult.messages.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-100 truncate">{m.from}</span>
                                {m.isUnread && (
                                  <span className="px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-[9px] font-bold text-red-300">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="font-medium text-zinc-300 truncate">{m.subject}</p>
                              <p className="text-[11px] text-zinc-500 line-clamp-1">{m.snippet}</p>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap shrink-0">
                              {m.date ? new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Compose or Draft Test */}
                <div className="pt-3 border-t border-zinc-800/60 space-y-2">
                  <div className="text-[11px] font-medium text-zinc-400">Quick Compose & Draft Test:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="To: recipient@example.com"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                    />
                    <input
                      type="text"
                      placeholder="Subject..."
                      value={testEmailSubject}
                      onChange={(e) => setTestEmailSubject(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <textarea
                    placeholder="Email body text..."
                    rows={2}
                    value={testEmailBody}
                    onChange={(e) => setTestEmailBody(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-red-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateQuickDraft}
                      disabled={isSendingEmail || !testEmailTo.trim() || !testEmailSubject.trim() || !testEmailBody.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSendQuickEmail}
                      disabled={isSendingEmail || !testEmailTo.trim() || !testEmailSubject.trim() || !testEmailBody.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingEmail ? 'Sending...' : 'Send Email'}</span>
                    </button>
                  </div>
                  {sendEmailStatus && (
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200">
                      {sendEmailStatus}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Google Calendar Manual Sync */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Google Calendar</h4>
                      <p className="text-[11px] text-zinc-400">View and sync your primary Google Calendar schedule</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualCalendarSync}
                    disabled={isCalendarSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCalendarSyncing ? 'animate-spin' : ''}`} />
                    <span>{isCalendarSyncing ? 'Syncing...' : 'Sync Calendar Now'}</span>
                  </button>
                </div>

                {calendarSyncError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{calendarSyncError}</span>
                  </div>
                )}

                {calendarSyncResult && (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {calendarSyncResult.count === 0
                            ? 'No upcoming events found on your primary calendar.'
                            : `✓ Successfully synced ${calendarSyncResult.count} upcoming calendar ${
                                calendarSyncResult.count === 1 ? 'event' : 'events'
                              }`}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        Last synced: {calendarSyncResult.timestamp}
                      </span>
                    </div>

                    {calendarSyncResult.events.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {calendarSyncResult.events.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
                          >
                            <div>
                              <p className="font-medium text-zinc-100">{evt.summary}</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                {evt.start.dateTime
                                  ? `${new Date(evt.start.dateTime).toLocaleDateString([], {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    })} at ${new Date(evt.start.dateTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : evt.start.date || 'All Day'}
                              </p>
                              {evt.location && (
                                <p className="text-[10px] text-zinc-500 mt-0.5">📍 {evt.location}</p>
                              )}
                            </div>
                            {evt.htmlLink && (
                              <a
                                href={evt.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:text-sky-300 p-1"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Google Tasks Manual Sync */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Google Tasks</h4>
                      <p className="text-[11px] text-zinc-400">View and sync tasks from your Google account</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualTasksSync}
                    disabled={isTasksSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTasksSyncing ? 'animate-spin' : ''}`} />
                    <span>{isTasksSyncing ? 'Syncing...' : 'Sync Tasks Now'}</span>
                  </button>
                </div>

                {tasksSyncError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{tasksSyncError}</span>
                  </div>
                )}

                {tasksSyncResult && (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {tasksSyncResult.count === 0
                            ? 'No tasks found in your list.'
                            : `✓ Successfully synced ${tasksSyncResult.count} ${
                                tasksSyncResult.count === 1 ? 'task' : 'tasks'
                              } from "${tasksSyncResult.listTitle}"`}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-mono">
                        Last synced: {tasksSyncResult.timestamp}
                      </span>
                    </div>

                    {tasksSyncResult.tasks.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {tasksSyncResult.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 inline-block w-3.5 h-3.5 rounded border ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-500 border-emerald-400 text-white'
                                    : 'border-zinc-600'
                                } flex items-center justify-center`}
                              >
                                {task.status === 'completed' && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <div>
                                <p
                                  className={`font-medium ${
                                    task.status === 'completed'
                                      ? 'text-zinc-500 line-through'
                                      : 'text-zinc-100'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.notes && (
                                  <p className="text-[11px] text-zinc-400 mt-0.5 whitespace-pre-wrap">
                                    {task.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                task.status === 'completed'
                                  ? 'bg-zinc-800 text-zinc-400'
                                  : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                              }`}
                            >
                              {task.status === 'completed' ? 'Done' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Google Docs & Document Workspace */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-zinc-200">Google Docs & Document Workspace</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40">
                          Direct Read & Edit
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">Search, read, edit, and export documents directly to Google Docs</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSearchDriveDocs(driveDocsQuery)}
                      disabled={isDriveDocsLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isDriveDocsLoading ? 'animate-spin' : ''}`} />
                      <span>Search Drive</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManualDocsExport}
                      disabled={isDocsExporting}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDocsExporting ? 'animate-spin' : ''}`} />
                      <span>{isDocsExporting ? 'Exporting...' : 'Export State to Doc'}</span>
                    </button>
                  </div>
                </div>

                {docsExportError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{docsExportError}</span>
                  </div>
                )}

                {docsExportUrl && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✓ Google Doc created successfully!</span>
                    </div>
                    <a
                      href={docsExportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium underline"
                    >
                      <span>Open in Docs</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Drive Docs Browser */}
                <div className="space-y-3 pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search Google Drive Docs (e.g., 'Meeting Notes', 'Specs')..."
                      value={driveDocsQuery}
                      onChange={(e) => setDriveDocsQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchDriveDocs(driveDocsQuery);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchDriveDocs(driveDocsQuery)}
                      disabled={isDriveDocsLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium shrink-0 transition-colors"
                    >
                      Find
                    </button>
                  </div>

                  {driveDocsError && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                      {driveDocsError}
                    </div>
                  )}

                  {driveDocsList.length > 0 && (
                    <div className="max-h-44 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {driveDocsList.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-colors ${
                            selectedDocId === doc.id
                              ? 'bg-amber-950/30 border-amber-700/60'
                              : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <p className="font-semibold text-zinc-200 truncate">{doc.title}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectAndReadDoc(doc.id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-medium transition-colors"
                            >
                              {selectedDocId === doc.id && isLoadingDocContent ? 'Loading...' : 'View & Edit'}
                            </button>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Open in Google Docs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Doc Editor Panel */}
                  {selectedDocData && (
                    <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-amber-900/40 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold text-zinc-100 truncate">{selectedDocData.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={selectedDocData.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open Docs</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocId(null);
                              setSelectedDocData(null);
                            }}
                            className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="max-h-36 overflow-y-auto p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap">
                        {selectedDocData.content || '(Empty document)'}
                      </div>

                      {/* Append / Edit Form */}
                      <div className="space-y-2">
                        <textarea
                          placeholder="Type text to append to this Google Doc..."
                          rows={2}
                          value={docAppendText}
                          onChange={(e) => setDocAppendText(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono resize-y"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAppendOrEditDoc('append')}
                              disabled={isUpdatingDoc || !docAppendText.trim()}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {isUpdatingDoc ? 'Updating...' : '+ Append Text to Doc'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAppendOrEditDoc('replace')}
                              disabled={isUpdatingDoc || !docAppendText.trim()}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Replaces entire document body with this text"
                            >
                              Replace Entire Content
                            </button>
                          </div>
                          {docUpdateNotice && (
                            <span className="text-[11px] font-medium text-amber-300">
                              {docUpdateNotice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Google Sheets (Structured Data Logging) */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Google Sheets</h4>
                      <p className="text-[11px] text-zinc-400">Structured data registers, item inventories & automated logs</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualSheetsCreate}
                    disabled={isSheetsCreating}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${isSheetsCreating ? 'animate-spin' : ''}`} />
                    <span>{isSheetsCreating ? 'Creating Sheet...' : 'Create New Sheet Log'}</span>
                  </button>
                </div>

                {sheetsError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{sheetsError}</span>
                  </div>
                )}

                {sheetsResultUrl && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✓ Google Sheet log initialized!</span>
                    </div>
                    <a
                      href={sheetsResultUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium underline"
                    >
                      <span>Open Spreadsheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* 5. Google Contacts (People Resolution) */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-200">Google Contacts</h4>
                      <p className="text-[11px] text-zinc-400">Resolve email addresses, names, and contact details for messages and invites</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualContactsSync}
                    disabled={isContactsSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isContactsSyncing ? 'animate-spin' : ''}`} />
                    <span>{isContactsSyncing ? 'Syncing...' : 'Sync Contacts'}</span>
                  </button>
                </div>

                {contactsError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{contactsError}</span>
                  </div>
                )}

                {contactsResult && (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        <span>✓ Loaded {contactsResult.count} contacts from your Google account.</span>
                      </div>
                      <span className="text-[10px] text-purple-400/80 font-mono">
                        Last synced: {contactsResult.timestamp}
                      </span>
                    </div>

                    {contactsResult.contacts.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {contactsResult.contacts.map((c, i) => (
                          <div
                            key={c.resourceName || i}
                            className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-purple-950/80 border border-purple-700/50 flex items-center justify-center text-[10px] font-bold text-purple-300">
                                {c.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-100">{c.displayName}</p>
                                {c.emailAddresses && c.emailAddresses.length > 0 && (
                                  <p className="text-[11px] text-zinc-400">{c.emailAddresses.join(', ')}</p>
                                )}
                              </div>
                            </div>
                            {c.phoneNumbers && c.phoneNumbers.length > 0 && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {c.phoneNumbers[0]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Google Keep / Passive Reference Notes Archive */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-zinc-200">Google Keep & Reference Archive</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40">
                          Active Sync & Notes
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">Search, create, edit, and organize reference notes and archival quotes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadKeepNotes(keepSearchQuery)}
                      disabled={isKeepLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isKeepLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {keepActionNotice && (
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-300">
                    {keepActionNotice}
                  </div>
                )}

                {/* Search & Filter */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search notes in archive..."
                    value={keepSearchQuery}
                    onChange={(e) => {
                      setKeepSearchQuery(e.target.value);
                      handleLoadKeepNotes(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Note Title / Subject..."
                      value={newKeepTitle}
                      onChange={(e) => setNewKeepTitle(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Reference content or quote..."
                      value={newKeepContent}
                      onChange={(e) => setNewKeepContent(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateKeepNote}
                    disabled={!newKeepTitle.trim() && !newKeepContent.trim()}
                    className="w-full py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    + Save to Reference Archive
                  </button>
                </div>

                {keepNotesList.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 pt-1">
                    {keepNotesList.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-2 group"
                      >
                        {editingKeepId === n.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingKeepTitle}
                              onChange={(e) => setEditingKeepTitle(e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
                            />
                            <textarea
                              rows={3}
                              value={editingKeepContent}
                              onChange={(e) => setEditingKeepContent(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-y font-mono"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveEditKeepNote}
                                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKeepId(null)}
                                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-semibold text-amber-300 truncate">{n.title}</span>
                                {n.tags && n.tags.map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {n.url && (
                                  <a
                                    href={n.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                                    title="Open Google Doc mirror"
                                  >
                                    <span>Doc Link</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleExportKeepNoteToDocs(n)}
                                  className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors"
                                  title="Export this note to a new Google Doc"
                                >
                                  <FileText className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditKeepNote(n)}
                                  className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors"
                                  title="Edit note"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${n.title}\n\n${n.content}`);
                                    setKeepActionNotice(`✓ Copied "${n.title}" to clipboard`);
                                    setTimeout(() => setKeepActionNotice(null), 2500);
                                  }}
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                                  title="Copy note text"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKeepNoteItem(n.id)}
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-zinc-300 text-[11px] whitespace-pre-wrap">{n.content}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Google Chat & Webhooks Integration (Dual-Mode Engine) */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-zinc-100">Google Chat & Webhook Integration</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                          Dual-Mode Engine
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        1-on-1 Direct Messaging, Workspace Spaces, interactive CardV2 approvals & proactive push briefings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleScanChatSpaces}
                      disabled={isChatSpacesLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChatSpacesLoading ? 'animate-spin' : ''}`} />
                      <span>{isChatSpacesLoading ? 'Scanning...' : 'Scan Spaces & DMs'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyInboundEndpoint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all border border-zinc-700/50"
                      title="Copy webhook event endpoint for Google Cloud / Chat Bot configuration"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedEndpoint ? 'Copied!' : 'Copy Inbound URL'}</span>
                    </button>
                  </div>
                </div>

                {chatSpacesError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{chatSpacesError}</span>
                  </div>
                )}

                {/* Sub-Card A: Central Inbound Endpoint & Dynamic Dispatch Router */}
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-sky-400" />
                      <span>Central Inbound Handler & Dynamic Dispatch Router</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Active: /api/google-chat/event
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <b>1-on-1 DM Route:</b> Private alerts, confidential companion chatter, and high-priority manual execution.<br />
                    <b>Workspace Space Route:</b> Threaded topic hubs (e.g. <code>#operations</code>, <code>#schedules</code>, <code>#workbench-notes</code>) for operational logs and batch briefings.
                  </p>
                </div>

                {/* Sub-Card B: Create Space & Discovered Google Chat Spaces */}
                <div className="space-y-3 pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">
                      Create Space / Channel
                    </span>
                    {createSpaceStatus && (
                      <span className={`text-[11px] ${createSpaceStatus.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {createSpaceStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Space Display Name (e.g. Project Operations)..."
                      value={newSpaceDisplayName}
                      onChange={(e) => setNewSpaceDisplayName(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={newSpaceType}
                      onChange={(e) => setNewSpaceType(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="SPACE">Named Space</option>
                      <option value="GROUP_CHAT">Group Chat</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateChatSpace}
                      disabled={!newSpaceDisplayName.trim() || isCreatingSpace}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {isCreatingSpace ? 'Creating...' : '+ Create Space'}
                    </button>
                  </div>
                </div>

                {/* Discovered Google Chat Spaces & DMs */}
                {chatSpaces.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        Discovered Contacts, Spaces & DMs ({chatSpaces.length})
                      </span>
                      <span className="text-[11px] text-zinc-500">Auto-resolved names</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar">
                      {chatSpaces.map((sp) => {
                        const isDm =
                          sp.spaceType === 'DIRECT_MESSAGE' ||
                          sp.type === 'DIRECT_MESSAGE' ||
                          sp.type === 'DM' ||
                          sp.singleUserBotDm;
                        const isGroup = sp.spaceType === 'GROUP_CHAT' || sp.type === 'GROUP_CHAT';
                        const label = sp.displayName || (isDm ? 'Direct Message' : isGroup ? 'Group Conversation' : 'Workspace Space');

                        return (
                          <div
                            key={sp.name}
                            onClick={() => {
                              setSelectedTarget(sp.name);
                              handleLoadSpaceMessages(sp.name);
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              selectedTarget === sp.name
                                ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
                                : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <div className="truncate mr-2 flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-semibold ${
                                  isDm
                                    ? 'bg-sky-950/80 text-sky-300 border border-sky-700/40'
                                    : isGroup
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700/40'
                                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/40'
                                }`}
                              >
                                {isDm ? (
                                  <User className="w-3.5 h-3.5" />
                                ) : isGroup ? (
                                  <Users className="w-3.5 h-3.5" />
                                ) : (
                                  <MessageSquare className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-zinc-100 truncate text-[12px]">{label}</div>
                                <div className="text-[10px] text-zinc-500 font-mono truncate">{sp.name}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  isDm
                                    ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                                    : isGroup
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                }`}
                              >
                                {isDm ? 'DM' : isGroup ? 'Group' : 'Space'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Messages viewer for selected space */}
                    {selectedTarget && selectedTarget.startsWith('spaces/') && (
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-emerald-300">
                            Recent Messages ({messagesSpaceName === selectedTarget ? spaceMessages.length : 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadSpaceMessages(selectedTarget)}
                            disabled={isLoadingMessages}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                            <span>{isLoadingMessages ? 'Loading...' : 'Fetch Messages'}</span>
                          </button>
                        </div>

                        {spaceMessages.length > 0 ? (
                          <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {spaceMessages.map((msg) => (
                              <div key={msg.name} className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] space-y-0.5">
                                <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                                  <span className="font-semibold text-zinc-300">{msg.sender}</span>
                                  {msg.createTime && (
                                    <span>{new Date(msg.createTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                </div>
                                <p className="text-zinc-200">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-zinc-500 italic">No recent messages loaded. Click Fetch Messages to read.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Card C: Workspace Space Webhook Manager */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Space Webhooks Manager (Topic Hubs)
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {spaceWebhooks.length} webhook(s) registered
                    </span>
                  </div>

                  {/* Add Webhook Form */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Space Name (e.g. Operations Hub)"
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Space ID Slug (e.g. operations)"
                        value={newWebhookSpaceId}
                        onChange={(e) => setNewWebhookSpaceId(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="url"
                        placeholder="Incoming Webhook URL (https://chat.googleapis.com/...)"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-4 text-[11px] text-zinc-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWebhookAutoDaily}
                            onChange={(e) => setNewWebhookAutoDaily(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                          />
                          <span>Auto Morning Sweeps</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newWebhookAutoTasks}
                            onChange={(e) => setNewWebhookAutoTasks(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                          />
                          <span>Task Execution Alerts</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveWebhookConfig}
                        disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                      >
                        + Register Space Webhook
                      </button>
                    </div>
                  </div>

                  {/* Registered Webhooks List */}
                  {spaceWebhooks.length > 0 && (
                    <div className="space-y-2">
                      {spaceWebhooks.map((hook) => (
                        <div
                          key={hook.id}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-200">{hook.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                                #{hook.spaceId}
                              </span>
                              {hook.autoDailySummary && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  🌅 Daily Sweep
                                </span>
                              )}
                              {hook.autoTaskAlerts && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800">
                                  ⚡ Tasks
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-sm">
                              {hook.webhookUrl}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTarget(hook.webhookUrl);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
                            >
                              Select as Target
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWebhookConfig(hook.id)}
                              className="px-2 py-1 rounded-lg hover:bg-red-950/60 text-red-400 text-[11px] transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-Card D: Interactive Card Payloads & Dispatch Sandbox */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Interactive Card Payloads & Dispatch Sandbox
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">CardV2 Actions & Deep Links</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Destination Target</label>
                        <select
                          value={selectedTarget}
                          onChange={(e) => setSelectedTarget(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">Select a Space or Webhook...</option>
                          {chatSpaces.map((sp) => {
                            const isDm =
                              sp.spaceType === 'DIRECT_MESSAGE' ||
                              sp.type === 'DIRECT_MESSAGE' ||
                              sp.type === 'DM' ||
                              sp.singleUserBotDm;
                            const isGroup = sp.spaceType === 'GROUP_CHAT' || sp.type === 'GROUP_CHAT';
                            const prefix = isDm ? '[DM]' : isGroup ? '[Group]' : '[Space]';
                            return (
                              <option key={sp.name} value={sp.name}>
                                {prefix} {sp.displayName || sp.name}
                              </option>
                            );
                          })}
                          {spaceWebhooks.map((wh) => (
                            <option key={wh.id} value={wh.webhookUrl}>
                              [Webhook] {wh.name} (#{wh.spaceId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Card Payload Template</label>
                        <select
                          value={testCardType}
                          onChange={(e) => setTestCardType(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="text">Plain Text Message</option>
                          <option value="task_approval">Task Approval Card (Interactive Buttons)</option>
                          <option value="draft_preview">Draft Preview Card (Deep Links)</option>
                          <option value="schedule_sweep">Morning Schedule Sweep Card</option>
                          <option value="system_alert">Elara System Alert Card</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Message Content / Note</label>
                      <input
                        type="text"
                        value={testMessageText}
                        onChange={(e) => setTestMessageText(e.target.value)}
                        placeholder="Message or card title note..."
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="text-[11px] flex-1">
                        {chatDispatchStatus && (
                          <div className={`p-2 rounded-lg border text-[11px] ${
                            chatDispatchStatus.startsWith('✓')
                              ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                              : 'bg-red-950/50 border-red-800/60 text-red-300'
                          }`}>
                            {chatDispatchStatus}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowChatTroubleshooting(!showChatTroubleshooting)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-all border border-zinc-700/50 flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{showChatTroubleshooting ? 'Hide Setup Help' : 'Setup & Troubleshooting'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDispatchTestChat}
                          disabled={!selectedTarget || isDispatchingChat}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                        >
                          <Send className={`w-3.5 h-3.5 ${isDispatchingChat ? 'animate-spin' : ''}`} />
                          <span>{isDispatchingChat ? 'Dispatching...' : 'Dispatch to Google Chat'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Google Chat App Error & Interactive Troubleshooting Guide */}
                    {(showChatTroubleshooting || (chatDispatchStatus && chatDispatchStatus.includes('Google Chat app not found')) || (chatSpacesError && chatSpacesError.includes('Chat app'))) && (
                      <div className="mt-3 p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 text-xs animate-fadeIn">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Troubleshooting Guide: Google Chat Direct REST API vs Space Webhooks</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-amber-300">
                            Google Cloud Notice
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Google Chat enforces security on the REST API: direct <code>messages.create</code> calls to personal DMs/Spaces require a one-time <b>Google Chat App configuration</b> in the Google Cloud Console. Alternatively, <b>Space Webhooks</b> work immediately with zero configuration!
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Solution 1: Space Webhook */}
                          <div className="p-3 rounded-lg bg-zinc-900/90 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <Zap className="w-3.5 h-3.5" />
                              <span>Option 1: Instant Space Webhook (Recommended)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              Incoming Space Webhooks bypass all Chat bot registration requirements and work immediately for Cards, alerts, and sweeps.
                            </p>
                            <ol className="list-decimal list-inside text-[11px] text-zinc-300 space-y-1">
                              <li>Open your Google Chat Space (web or mobile)</li>
                              <li>Click Space title &rarr; <b>Apps & integrations</b> &rarr; <b>Webhooks</b></li>
                              <li>Click <b>Add webhook</b>, name it "Elara", copy URL</li>
                              <li>Paste into the <b>Space Webhooks Manager</b> above and send!</li>
                            </ol>
                          </div>

                          {/* Solution 2: Google Cloud Console Setup */}
                          <div className="p-3 rounded-lg bg-zinc-900/90 border border-sky-500/30 space-y-2">
                            <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Option 2: 1-Minute Google Cloud Console Config</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              To send direct 1:1 messages or DMs via user OAuth:
                            </p>
                            <ol className="list-decimal list-inside text-[11px] text-zinc-300 space-y-1">
                              <li>Open Google Cloud Console &rarr; <b>Google Chat API</b></li>
                              <li>Click the <b>Configuration</b> tab</li>
                              <li>Enter App name (e.g. <i>Elara</i>) and any avatar image URL</li>
                              <li>Under <i>Interactive features</i>, check <b>Receive 1:1 messages</b></li>
                              <li>Under <i>Visibility</i>, check your email domain & click <b>Save</b></li>
                            </ol>
                            <a
                              href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 text-[11px] font-medium hover:bg-sky-900 transition-colors mt-1"
                            >
                              <span>Open Google Cloud Chat API Config</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Card E: Proactive Outbound Notification Engine */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Proactive Outbound Push Engine
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">Autonomous Broadcast</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleProactivePushTrigger('morning_sweep')}
                      disabled={isProactivePushing || spaceWebhooks.length === 0}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-emerald-500/60 text-left transition-all group disabled:opacity-40"
                    >
                      <div className="text-xs font-medium text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5">
                        <span>🌅</span> Morning Schedule Sweep
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Pushes today's Google Calendar agenda & priority tasks to registered spaces
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleProactivePushTrigger('task_summary')}
                      disabled={isProactivePushing || spaceWebhooks.length === 0}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-sky-500/60 text-left transition-all group disabled:opacity-40"
                    >
                      <div className="text-xs font-medium text-sky-300 group-hover:text-sky-200 flex items-center gap-1.5">
                        <span>⚡</span> Task Status Briefing
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Broadcasts task completion logs & pending item alerts to space webhooks
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleProactivePushTrigger('system_alert')}
                      disabled={isProactivePushing || spaceWebhooks.length === 0}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/60 text-left transition-all group disabled:opacity-40"
                    >
                      <div className="text-xs font-medium text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                        <span>🛡️</span> System Status Alert
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Sends workspace health check & latency briefing across all spaces
                      </p>
                    </button>
                  </div>

                  {proactivePushStatus && (
                    <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">{proactivePushStatus}</span>
                    </div>
                  )}
                </div>

                {/* Sub-Card F: GitHub Actions Scheduled Cron & External Triggers */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Automated Cron Triggers (GitHub Actions & Webhook Sweeps)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/70 text-purple-300 border border-purple-800/50">
                      Background Automation
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Trigger Elara's morning schedule sweeps and proactive Google Chat updates automatically using a free <b>GitHub Actions cron workflow</b> or an external ping.
                  </p>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200 text-xs">1. Ready-to-use GitHub Actions Workflow</span>
                      <button
                        type="button"
                        onClick={() => {
                          const yamlContent = `name: Elara Google Chat Daily Sweep
on:
  schedule:
    # Runs at 08:00 UTC every weekday (Mon-Fri)
    - cron: '0 8 * * 1-5'
  workflow_dispatch: # Allows manual trigger from GitHub UI

jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Elara Morning Schedule Sweep
        run: |
          curl -X POST "\${{ secrets.APP_URL }}/api/chat/proactive" \\
            -H "Content-Type: application/json" \\
            -d '{"type": "morning_sweep"}'
`;
                          navigator.clipboard.writeText(yamlContent);
                          setProactivePushStatus('✓ Copied .github/workflows/elara-chat-cron.yml to clipboard!');
                          setTimeout(() => setProactivePushStatus(null), 3000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Workflow YAML</span>
                      </button>
                    </div>

                    <pre className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono overflow-x-auto">
{`# File: .github/workflows/elara-chat-cron.yml
name: Elara Google Chat Daily Sweep
on:
  schedule:
    - cron: '0 8 * * 1-5'  # 8:00 AM UTC Mon-Fri
  workflow_dispatch:

jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Proactive Sweep
        run: |
          curl -X POST "\${{ secrets.APP_URL }}/api/chat/proactive" \\
            -H "Content-Type: application/json" \\
            -d '{"type": "morning_sweep"}'`}
                    </pre>

                    <div className="space-y-1 text-[11px] text-zinc-400">
                      <p><b className="text-zinc-300">Quick Setup:</b> In your GitHub Repository, add a secret named <code className="text-purple-300">APP_URL</code> pointing to your deployed applet domain (or Cloud Run URL), and commit this file to <code className="text-purple-300">.github/workflows/</code>.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VOICE & SPEECH-TO-TEXT */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Header Overview Card */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Mic className="w-4 h-4" />
                  <span>Live Speech-to-Text & Voice Dictation</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Speak directly to Elara using your microphone. High-speed speech recognition translates your voice into real-time text inside the chat composer, with automatic sentence capitalization and intelligent pause detection.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 font-mono">
                    ✓ Browser Native Web Speech API
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-600/40 text-sky-300 font-mono">
                    ✓ Gemini Audio Transcription Fallback
                  </span>
                </div>
              </div>

              {/* Language Selection */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-200 block">
                      Spoken Language
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Primary dialect used for acoustic speech modeling
                    </p>
                  </div>
                  <select
                    value={formData.speechLanguage || 'en-US'}
                    onChange={(e) => setFormData({ ...formData, speechLanguage: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-CA">English (Canada)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-MX">Español (México)</option>
                    <option value="es-US">Español (Estados Unidos)</option>
                    <option value="fr-FR">Français (France)</option>
                    <option value="fr-CA">Français (Canada)</option>
                    <option value="de-DE">Deutsch (Deutschland)</option>
                    <option value="it-IT">Italiano (Italia)</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="pt-PT">Português (Portugal)</option>
                    <option value="ja-JP">日本語 (Japanese)</option>
                    <option value="ko-KR">한국어 (Korean)</option>
                    <option value="zh-CN">中文 (Mandarin - Simplified)</option>
                    <option value="zh-TW">中文 (Mandarin - Traditional)</option>
                    <option value="ru-RU">Русский (Russian)</option>
                    <option value="af-ZA">Afrikaans (South Africa)</option>
                    <option value="nl-NL">Nederlands (Netherlands)</option>
                    <option value="sv-SE">Svenska (Sweden)</option>
                    <option value="ar-SA">العربية (Arabic - Saudi Arabia)</option>
                    <option value="hi-IN">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>

              {/* Formatting & Behavior Controls */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 space-y-5">
                <h4 className="text-xs font-semibold text-zinc-200">Voice Transcription Behavior</h4>

                {/* Auto-Capitalize */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-medium text-zinc-200 block">
                      Auto-Capitalize Sentences
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Automatically capitalize the start of sentences and proper pronouns ("I", "I'm")
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        speechAutoCapitalize: formData.speechAutoCapitalize !== false ? false : true,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.speechAutoCapitalize !== false ? 'bg-emerald-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.speechAutoCapitalize !== false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto-Send on Pause */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                  <div>
                    <label className="text-xs font-medium text-zinc-200 block">
                      Auto-Send on Speech Pause
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Automatically dispatch the message after a period of conversational silence
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        speechAutoSend: !formData.speechAutoSend,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.speechAutoSend ? 'bg-emerald-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.speechAutoSend ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Pause Timeout Slider */}
                {formData.speechAutoSend && (
                  <div className="pt-3 border-t border-zinc-800/60 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-200">Silence Pause Duration</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {((formData.speechPauseTimeout || 2000) / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={4000}
                      step={250}
                      value={formData.speechPauseTimeout || 2000}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          speechPauseTimeout: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>1.0s (Fast)</span>
                      <span>2.0s (Recommended)</span>
                      <span>4.0s (Relaxed)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM PROMPT & MODULES */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Main System Prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Base System Prompt
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPromptResetConfirm(true)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>

                {showPromptResetConfirm && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 flex items-center justify-between">
                    <span>Reset all prompt modules to default values?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetPrompt}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium"
                      >
                        Yes, Reset All
                      </button>
                      <button
                        onClick={() => setShowPromptResetConfirm(false)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
                />
              </div>

              {/* Module 1: Master Persona Protocol */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  1. Master Persona Protocol
                </label>
                <textarea
                  value={formData.personaProtocol}
                  onChange={(e) => setFormData({ ...formData, personaProtocol: e.target.value })}
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
                />
              </div>

              {/* Module 2: Romantic & Intimacy Module */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  2. Romantic & Intimacy Module
                </label>
                <textarea
                  value={formData.intimacyModule}
                  onChange={(e) => setFormData({ ...formData, intimacyModule: e.target.value })}
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
                />
              </div>

              {/* Module 3: Runtime & Scratchpad Rules */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  3. Runtime & Scratchpad Rules
                </label>
                <textarea
                  value={formData.runtimeRules}
                  onChange={(e) => setFormData({ ...formData, runtimeRules: e.target.value })}
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-sky-500 leading-relaxed resize-y custom-scrollbar"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DATA BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Data Management & Backup
              </h3>

              {importStatus && (
                <div className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-800/60 text-xs text-sky-300">
                  {importStatus}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onExportAllData}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Export All Conversations</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
                >
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Import Conversations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-xs font-medium text-red-400 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear History</span>
                </button>
              </div>

              {showClearConfirm && (
                <div className="mt-3 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Are you sure you want to clear your chat history?</span>
                  </div>
                  <p className="text-red-300/80">This action will delete all local history permanently.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        onClearAllData();
                        setShowClearConfirm(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium"
                    >
                      Delete Everything
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-[#121212] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

