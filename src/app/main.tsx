import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { listenForInstallPrompt, registerServiceWorker } from '@/features/notifications/push';
import { disablePageZoom } from './no-zoom';
import './styles/index.css';

disablePageZoom();
listenForInstallPrompt();
void registerServiceWorker();

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
