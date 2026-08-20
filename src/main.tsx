import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppearanceQuickPanel } from './components/AppearanceQuickPanel';
import { ModelTuningQuickPanel } from './components/ModelTuningQuickPanel';
import { AgentBehaviorPolicyPanel } from './components/AgentBehaviorPolicyPanel';
import { ElaraSurfaces } from './components/ElaraSurfaces';
import { OocConversationPanel } from './components/OocConversationPanel';
import { BackgroundNotificationsControl } from './components/BackgroundNotificationsControl';
import { installBackgroundSafeAbortBoundary } from './lib/backgroundSafeRuntime';
import { installMobileViewportSync } from './lib/mobileViewport';
import './index.css';
import './mobile-chat.css';
import './chat-pass1-declutter.css';

installBackgroundSafeAbortBoundary();
installMobileViewportSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppearanceQuickPanel />
    <ModelTuningQuickPanel />
    <AgentBehaviorPolicyPanel />
    <ElaraSurfaces />
    <OocConversationPanel />
    <BackgroundNotificationsControl />
  </StrictMode>,
);