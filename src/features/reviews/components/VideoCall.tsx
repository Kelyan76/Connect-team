import type { DailyCall } from '@daily-co/daily-js';
import { Loader2, PhoneOff, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { getVideoAccess } from '../video';

/**
 * Visio du 1 à 1, intégrée à la page (service Daily) : le guide, les notes et Echo restent juste en dessous.
 * La bibliothèque n'est chargée qu'au moment de rejoindre.
 */
export function VideoCall({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const call = useRef<DailyCall | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ url, token }, { default: Daily }] = await Promise.all([
          getVideoAccess(reviewId),
          import('@daily-co/daily-js'),
        ]);
        if (cancelled || !container.current) return;
        const frame = Daily.createFrame(container.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '16px' },
          showLeaveButton: true,
          showFullscreenButton: true,
          lang: 'fr',
        });
        call.current = frame;
        frame.on('left-meeting', () => onClose());
        await frame.join({ url, token });
        if (!cancelled) setState('ready');
      } catch (e) {
        if (cancelled) return;
        setError(toUserMessage(e, 'La visio n’a pas pu démarrer.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
      void call.current?.destroy();
      call.current = null;
    };
  }, [reviewId, onClose]);

  return (
    <section aria-label="Visio du 1 à 1" className="mb-6 flex animate-page-in flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-base font-medium">
          <Video className="size-4 text-accent" aria-hidden />
          Visio
          {state === 'loading' && (
            <Loader2 className="size-4 text-fg-subtle motion-safe:animate-spin" aria-hidden />
          )}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={onClose}
        >
          <PhoneOff aria-hidden />
          Quitter
        </Button>
      </div>
      {state === 'error' ? (
        <p
          role="alert"
          className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-fg-muted"
        >
          {error}
        </p>
      ) : (
        <div
          ref={container}
          className="h-[60vh] min-h-80 w-full overflow-hidden rounded-lg border border-line bg-slate-900"
        />
      )}
    </section>
  );
}
