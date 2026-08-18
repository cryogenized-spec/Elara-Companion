import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppearanceQuickPanel } from './components/AppearanceQuickPanel';
import { ModelTuningQuickPanel } from './components/ModelTuningQuickPanel';
import { AgentPolicyPanel } from './components/AgentPolicyPanel';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppearanceQuickPanel />
    <ModelTuningQuickPanel />
    <AgentPolicyPanel />
  </StrictMode>,
);
