import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppearanceQuickPanel } from './components/AppearanceQuickPanel';
import { ModelTuningQuickPanel } from './components/ModelTuningQuickPanel';
import { AgentBehaviorPolicyPanel } from './components/AgentBehaviorPolicyPanel';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppearanceQuickPanel />
    <ModelTuningQuickPanel />
    <AgentBehaviorPolicyPanel />
  </StrictMode>,
);
