/** Événement global pour ouvrir l'assistant depuis n'importe où (accueil, bouton « + »). */
export const OPEN_ASSISTANT = 'connect-team:assistant';
export const openAssistant = () => window.dispatchEvent(new Event(OPEN_ASSISTANT));
