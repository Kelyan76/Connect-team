import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { disablePageZoom } from './no-zoom';
import './styles/index.css';

disablePageZoom();

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
