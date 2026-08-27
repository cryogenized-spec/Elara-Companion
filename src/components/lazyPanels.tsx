import React, { Suspense } from 'react';
import type { CanvasData, Settings, WorldState } from '../types';

const LazyCanvasPanelImpl = React.lazy(async () => {
  const module = await import('./CanvasPanel');
  return { default: module.CanvasPanel };
});

const LazyWorkspaceViewImpl = React.lazy(async () => {
  const module = await import('./WorkspaceView');
  return { default: module.WorkspaceView };
});

const LazySettingsModalImpl = React.lazy(async () => {
  const module = await import('./SettingsModal');
  return { default: module.SettingsModal };
});

const LazyWorldModalImpl = React.lazy(async () => {
  const module = await import('./WorldModal');
  return { default: module.WorldModal };
});

const LazyThoughtLogModalImpl = React.lazy(async () => {
  const module = await import('./ThoughtLogModal');
  return { default: module.ThoughtLogModal };
});

const LazyPortraitViewerModalImpl = React.lazy(async () => {
  const module = await import('./PortraitViewerModal');
  return { default: module.PortraitViewerModal };
});

const LazyCameraModalImpl = React.lazy(async () => {
  const module = await import('./CameraModal');
  return { default: module.CameraModal };
});

export interface LazyCanvasPanelProps {
  canvas: CanvasData | null;
  onClose: () => void;
  onUpdateContent?: (content: string) => void;
}

export const CanvasPanel: React.FC<LazyCanvasPanelProps> = (props) => (
  <Suspense fallback={null}>
    <LazyCanvasPanelImpl {...props} />
  </Suspense>
);

export interface LazyWorkspaceViewProps {
  activeArtifactId?: string | null;
  onSelectArtifact?: (id: string) => void;
  onBackToChat?: () => void;
  onOpenSidebar?: () => void;
}

export const WorkspaceView: React.FC<LazyWorkspaceViewProps> = (props) => (
  <Suspense fallback={null}>
    <LazyWorkspaceViewImpl {...props} />
  </Suspense>
);

export interface LazySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (settings: Settings) => void;
  customPortrait: string | null;
  onUploadPortrait: (base64: string) => void;
  onRemovePortrait: () => void;
  onExportAllData?: () => void;
  onImportData?: (json: string) => void;
}

export const SettingsModal: React.FC<LazySettingsModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazySettingsModalImpl {...props} />
  </Suspense>
);

export interface LazyWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldState: WorldState;
  onSaveWorldState: (state: WorldState) => void;
  onResetWorldState: () => void;
  onExportWorldState: () => void;
  onImportWorldState: (json: string) => void;
  userName: string;
}

export const WorldModal: React.FC<LazyWorldModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazyWorldModalImpl {...props} />
  </Suspense>
);

export const ThoughtLogModal = (props: React.ComponentProps<typeof import('./ThoughtLogModal').ThoughtLogModal>) => (
  <Suspense fallback={null}>
    <LazyThoughtLogModalImpl {...props} />
  </Suspense>
);

export const PortraitViewerModal = (props: React.ComponentProps<typeof import('./PortraitViewerModal').PortraitViewerModal>) => (
  <Suspense fallback={null}>
    <LazyPortraitViewerModalImpl {...props} />
  </Suspense>
);

export const CameraModal = (props: React.ComponentProps<typeof import('./CameraModal').CameraModal>) => (
  <Suspense fallback={null}>
    <LazyCameraModalImpl {...props} />
  </Suspense>
);
