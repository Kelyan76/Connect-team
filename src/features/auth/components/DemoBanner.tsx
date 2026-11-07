import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toUserMessage } from '@/shared/lib/errors';
import { toast } from '@/shared/ui/toaster';
import { readDemoReturn, returnToManager } from '../demo-switch';

/** Bandeau affiché pendant un test « en tant que collaborateur », avec le retour au compte manager. */
export function DemoBanner({ viewerName }: { viewerName: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const saved = readDemoReturn();
  if (!saved) return null;

  const back = async () => {
    setBusy(true);
    try {
      await returnToManager();
      navigate('/', { replace: true });
      toast.success(`Bon retour, ${saved.name}`);
    } catch (e) {
      toast.error(toUserMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex animate-fade-in items-center gap-3 bg-gradient-to-r from-hero-from to-hero-to px-4 py-2 text-sm text-white lg:px-6">
      <span className="min-w-0 flex-1 truncate">
        Mode test · connecté en tant que <span className="font-semibold">{viewerName}</span>
      </span>
      <button
        type="button"
        onClick={() => void back()}
        disabled={busy}
        className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-accent transition-transform active:scale-95 disabled:opacity-70"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowLeftRight className="size-4" aria-hidden />}
        <span className="hidden sm:inline">Revenir à mon compte manager</span>
        <span className="sm:hidden">Retour manager</span>
      </button>
    </div>
  );
}
