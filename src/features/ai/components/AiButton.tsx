import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toaster';

interface Props {
  label: string;
  /** Lance l'appel ; l'erreur éventuelle est affichée en toast. */
  run: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

/** Bouton « IA » : style reconnaissable (violet doux), état de chargement, erreurs en toast. */
export function AiButton({ label, run, disabled, className, size = 'sm' }: Props) {
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try {
      await run();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'L’assistant IA n’a pas pu répondre.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      size={size}
      disabled={disabled || busy}
      onClick={() => void click()}
      className={cn(
        'border-sec-reviews/30 bg-sec-reviews/10 text-sec-reviews shadow-none hover:bg-sec-reviews/15',
        className,
      )}
    >
      {busy ? (
        <Loader2 className="motion-safe:animate-spin" aria-hidden />
      ) : (
        <Sparkles aria-hidden />
      )}
      {busy ? 'L’IA réfléchit…' : label}
    </Button>
  );
}
