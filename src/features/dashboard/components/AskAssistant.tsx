import { Sparkles } from 'lucide-react';
import { openAssistant } from '@/features/ai/open-assistant';
import { Button } from '@/shared/ui/button';

/** Bouton du bandeau d'accueil : ouvre l'assistant IA. */
export function AskAssistant() {
  return (
    <Button
      className="flex-1 border-transparent bg-white text-accent hover:bg-white/90 sm:flex-none"
      onClick={openAssistant}
    >
      <Sparkles aria-hidden />
      Demander à l’assistant
    </Button>
  );
}
