import { Loader2, Mic, RotateCcw, Sparkles, Square, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toUserMessage } from '@/shared/lib/errors';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Textarea } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toaster';
import { generateRecap, recapToNotes, speechRecognitionCtor, type ReviewRecap, type SpeechRecognitionLike } from '../lib/recap';

type Step = 'idle' | 'recording' | 'review' | 'recap';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</span>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Enregistrement vocal pendant l'entretien : transcription en direct (reconnaissance vocale du navigateur),
 * puis récap rédigé par l'IA, relu par le manager avant d'être ajouté au compte-rendu.
 * Aucun son n'est enregistré ni conservé : seule la transcription texte est utilisée.
 */
export function VoiceRecap({
  reviewId,
  collaboratorName,
  onInsert,
}: {
  reviewId: string;
  collaboratorName: string;
  onInsert: (notes: string, synthese: string) => void;
}) {
  const Ctor = speechRecognitionCtor();
  const [step, setStep] = useState<Step>('idle');
  const [consent, setConsent] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recap, setRecap] = useState<{ recap: ReviewRecap; demo: boolean } | null>(null);
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

  // Arrêt propre si l'on quitte la page en cours d'enregistrement.
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
    // La reconnaissance s'interrompt après un silence : on la relance tant que l'enregistrement continue.
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
    setRecap(null);
    setStep('idle');
  };

  const summarize = async () => {
    setBusy(true);
    try {
      const result = await generateRecap(reviewId, finalText.trim());
      setRecap(result);
      setStep('recap');
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-sec-reviews/20 bg-gradient-to-br from-sec-reviews/10 to-surface p-4">
      {step === 'idle' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded bg-sec-reviews text-white shadow-sm">
            <Mic className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-medium">Enregistrer l’entretien</span>
            <span className="text-sm text-fg-muted">Transcription en direct, puis récap rédigé par l’IA que vous relisez.</span>
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
            <span className="text-base font-medium">Enregistrement en cours</span>
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
            <Button variant="primary" disabled={busy || finalText.trim().length < 40} onClick={() => void summarize()}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Wand2 aria-hidden />}
              {busy ? 'Rédaction du récap…' : 'Générer le récap'}
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

      {step === 'recap' && recap && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-sec-reviews" aria-hidden />
            <span className="text-base font-medium">Récap proposé</span>
            {recap.demo && <span className="text-xs text-fg-subtle">(démonstration locale)</span>}
          </div>
          <div className="flex flex-col gap-3 rounded bg-surface p-4">
            <p className="text-base leading-6">{recap.recap.synthese}</p>
            <Section title="Points abordés" items={recap.recap.points} />
            <Section title="Décisions" items={recap.recap.decisions} />
            <Section
              title="Actions"
              items={recap.recap.actions.map(
                (a) => `${a.titre} · ${a.responsable === 'manager' ? 'vous' : collaboratorName}${a.echeance ? ` · ${formatDate(a.echeance)}` : ''}`,
              )}
            />
            <Section title="À suivre (visible par vous seul dans vos notes)" items={recap.recap.vigilance} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onInsert(recapToNotes(recap.recap, formatDate), recap.recap.synthese);
                toast.success('Récap ajouté au compte-rendu');
                reset();
              }}
            >
              Ajouter au compte-rendu
            </Button>
            <Button onClick={() => setStep('review')}>Revoir la transcription</Button>
            <Button variant="ghost" onClick={reset}>
              Ignorer
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={consent}
        onOpenChange={setConsent}
        title="Démarrer l’enregistrement ?"
        description={`Prévenez ${collaboratorName} et obtenez son accord avant de démarrer. Seul le texte est transcrit (aucun son n’est conservé) ; le récap est envoyé à l’IA pour être rédigé, puis vous le relisez.`}
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

