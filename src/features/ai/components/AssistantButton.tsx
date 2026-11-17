import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OPEN_ASSISTANT } from '../open-assistant';
import { AssistantPanel } from './AssistantPanel';

/** Bouton « Assistant » de l'en-tête (toutes les pages) et fenêtre de discussion associée. */
export function AssistantButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_ASSISTANT, show);
    return () => window.removeEventListener(OPEN_ASSISTANT, show);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-full bg-sec-reviews/10 px-3 text-sm font-medium text-sec-reviews transition-colors hover:bg-sec-reviews/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sec-reviews"
        aria-label="Ouvrir l’assistant IA"
      >
        <Sparkles className="size-4" aria-hidden />
        <span className="hidden sm:inline">Assistant</span>
      </button>
      <AssistantPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
