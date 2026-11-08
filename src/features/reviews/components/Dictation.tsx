import { Mic, NotebookPen, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Textarea } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toaster';
import { speechRecognitionCtor, type SpeechRecognitionLike } from '../lib/speech';

type Step = 'idle' | 'recording' | 'review';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Dictée pendant l'entretien : la conversation est transcrite en direct par la reconnaissance vocale
 * du navigateur (gratuite, aucun son conservé), puis le texte relu est ajouté aux notes.
 */
export function Dictation({ collaboratorName, onInsert }: { collaboratorName: string; onInsert: (text: string) => void }) {
  const Ctor = speechRecognitionCtor();
  const [step, setStep] = useState<Step>('idle');
  const [consent, setConsent] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const recording = useRef(false);
  const live = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 'recording') return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [step]);

  useEffect(() => {
    live.current?.scrollTo({ top: live.current.scrollHeight });
  }, [finalText, interim]);

  // Arrêt propre si l'on quitte la page en pleine dictée.
  useEffect(
    () => () => {
      recording.current = false;
      recognition.current?.stop();
    },
    [],
  );

  if (!Ctor) {
    return (
      <div className="flex items-center gap-3 rounded border border-dashed border-line-strong px-4 py-3 text-sm text-fg-muted">
        <Mic className="size-4 shrink-0" aria-hidden />
        La dictée n’est pas disponible sur ce navigateur : utilisez Chrome, Edge ou Safari.
      </div>
    );
  }

  const start = () => {
    const r = new Ctor();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interimText = '';
      let added = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        if (res.isFinal) added += `${res[0].transcript.trim()}. `;
        else interimText += res[0].transcript;
      }
      if (added) setFinalText((t) => t + added);
      setInterim(interimText);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        recording.current = false;
        toast.error('Micro refusé : autorisez-le dans les réglages du navigateur.');
        setStep(finalText ? 'review' : 'idle');
      }
    };
    // La reconnaissance s'interrompt après un silence : on la relance tant que la dictée continue.
    r.onend = () => {
      if (recording.current) {
        try {
          r.start();
        } catch {
          // déjà relancée
        }
      }
    };
    recognition.current = r;
    recording.current = true;
    setSeconds(0);
    setStep('recording');
    r.start();
  };

  const stop = () => {
    recording.current = false;
    recognition.current?.stop();
    setFinalText((t) => (interim ? `${t}${interim.trim()}. ` : t));
    setInterim('');
    setStep('review');
  };

  const reset = () => {
    setFinalText('');
    setInterim('');
    setStep('idle');
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-sec-reviews/20 bg-gradient-to-br from-sec-reviews/10 to-surface p-4">
      {step === 'idle' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded bg-sec-reviews text-white shadow-sm">
            <Mic className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-medium">Dicter les notes</span>
            <span className="text-sm text-fg-muted">La conversation s’écrit toute seule ; vous relisez avant de l’ajouter.</span>
          </div>
          <Button variant="primary" onClick={() => setConsent(true)}>
            <Mic aria-hidden />
            Démarrer
          </Button>
        </div>
      )}

      {step === 'recording' && (
        <>
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-danger" />
            </span>
            <span className="text-base font-medium">Dictée en cours</span>
            <span className="tabular text-sm text-fg-muted">{mmss(seconds)}</span>
            <Button className="ml-auto" variant="danger" onClick={stop}>
              <Square aria-hidden />
              Arrêter
            </Button>
          </div>
          <div ref={live} className="max-h-48 min-h-20 overflow-y-auto rounded bg-surface px-3 py-2 text-sm leading-6" aria-live="polite">
            {finalText}
            <span className="text-fg-subtle">{interim}</span>
            {!finalText && !interim && <span className="text-fg-subtle">Parlez normalement, le texte apparaît ici…</span>}
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <span className="text-base font-medium">Transcription ({mmss(seconds)}) · corrigez si besoin</span>
          <Textarea rows={6} value={finalText} onChange={(e) => setFinalText(e.target.value)} aria-label="Transcription de l’entretien" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!finalText.trim()}
              onClick={() => {
                onInsert(finalText.trim());
                toast.success('Transcription ajoutée aux notes');
                reset();
              }}
            >
              <NotebookPen aria-hidden />
              Ajouter aux notes
            </Button>
            <Button onClick={start}>
              <Mic aria-hidden />
              Reprendre
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden />
              Effacer
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={consent}
        onOpenChange={setConsent}
        title="Démarrer la dictée ?"
        description={`Prévenez ${collaboratorName} et obtenez son accord avant de démarrer. Seul le texte est transcrit (aucun son n’est conservé), puis vous le relisez avant de l’ajouter aux notes.`}
        confirmLabel="J’ai son accord, démarrer"
        destructive={false}
        onConfirm={() => {
          setConsent(false);
          start();
        }}
      />
    </section>
  );
}
