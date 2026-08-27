import React, { Suspense } from 'react';
import type { CanvasData, ElaraSettings, WorldState } from '../types';

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

export type LazyCanvasPanelProps = React.ComponentProps<typeof import('./CanvasPanel').CanvasPanel>;
export const CanvasPanel: React.FC<LazyCanvasPanelProps> = (props) => (
  <Suspense fallback={null}>
    <LazyCanvasPanelImpl {...props} />
  </Suspense>
);

export type LazyWorkspaceViewProps = React.ComponentProps<typeof import('./WorkspaceView').WorkspaceView>;
export const WorkspaceView: React.FC<LazyWorkspaceViewProps> = (props) => (
  <Suspense fallback={null}>
    <LazyWorkspaceViewImpl {...props} />
  </Suspense>
);

export type LazySettingsModalProps = {
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
};
export const SettingsModal: React.FC<LazySettingsModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazySettingsModalImpl {...props} />
  </Suspense>
);

export type LazyWorldModalProps = React.ComponentProps<typeof import('./WorldModal').WorldModal>;
export const WorldModal: React.FC<LazyWorldModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazyWorldModalImpl {...props} />
  </Suspense>
);

export type LazyThoughtLogModalProps = React.ComponentProps<typeof import('./ThoughtLogModal').ThoughtLogModal>;
export const ThoughtLogModal: React.FC<LazyThoughtLogModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazyThoughtLogModalImpl {...props} />
  </Suspense>
);

export type LazyPortraitViewerModalProps = React.ComponentProps<typeof import('./PortraitViewerModal').PortraitViewerModal>;
export const PortraitViewerModal: React.FC<LazyPortraitViewerModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazyPortraitViewerModalImpl {...props} />
  </Suspense>
);

export type LazyCameraModalProps = React.ComponentProps<typeof import('./CameraModal').CameraModal>;
export const CameraModal: React.FC<LazyCameraModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazyCameraModalImpl {...props} />
  </Suspense>
);

export type { CanvasData, WorldState };
