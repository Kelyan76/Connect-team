import { AudioLines, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Checkbox } from '@/shared/ui/toggle';
import type { Review } from '../api';
import { ECHO_MAX_SECONDS, transcribeWithEcho } from '../echo-client';
import { toDrafts, type ActionDraft } from '../lib/echo';
import { useAddActions } from '../queries';
import { EchoDrafts } from './EchoDrafts';

type Stage = 'idle' | 'recording' | 'processing' | 'results' | 'error';

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
const pickMime = () => MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Enregistrement du récapitulatif du 1 à 1 avec Echo, avec l'accord du collaborateur.
 * Echo transcrit et propose les engagements ; le manager relit puis les ajoute au plan d'action.
 * Ni l'audio ni la transcription ne sont conservés.
 */
export function EchoRecorder({ review }: { review: Review }) {
  const { profile } = useCurrentUser();
  const team = useTeamMembers();
  const addActions = useAddActions();
  const collaborator = team.byId.get(review.collaborator_id)?.first_name ?? 'le collaborateur';
  const names = { manager: profile.first_name, collaborator };

  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [summary, setSummary] = useState('');
  const [drafts, setDrafts] = useState<ActionDraft[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | undefined>(undefined);

  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

  const release = () => {
    window.clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => () => {
    if (recorder.current?.state === 'recording') recorder.current.onstop = null;
    release();
  }, []);

  const analyse = async (audio: Blob) => {
    setStage('processing');
    try {
      const result = await transcribeWithEcho(audio);
      setSummary(result.summary);
      setDrafts(toDrafts(result, names));
      setStage('results');
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Analyse impossible.'));
      setStage('error');
    }
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24000 });
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        release();
        void analyse(new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }));
      };
      rec.start(1000);
      recorder.current = rec;
      setSeconds(0);
      setStage('recording');
      timer.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= ECHO_MAX_SECONDS) rec.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError(new Error('Micro inaccessible : autorisez-le dans le navigateur puis réessayez.'));
      setStage('error');
    }
  };

  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const restart = () => {
    setStage('idle');
    setDrafts([]);
    setSummary('');
    setError(null);
  };

  const add = () => {
    const list = drafts
      .filter((d) => d.keep && d.title.trim().length >= 3)
      .map((d) => ({
        review_id: review.id,
        title: d.title.trim(),
        owner_id: d.owner === 'manager' ? profile.id : review.collaborator_id,
        due_date: d.due || null,
      }));
    addActions.mutate(list, { onSuccess: restart });
  };

  return (
    <Panel
      title="Récapituler avec Echo"
      description={`En fin d’entretien, dites à voix haute qui fait quoi et pour quand : Echo en tire les engagements.`}
    >
      {!supported ? (
        <p className="text-sm text-fg-muted">L’enregistrement n’est pas disponible sur ce navigateur. Ajoutez les actions à la main ci-dessous.</p>
      ) : stage === 'results' ? (
        <EchoDrafts
          summary={summary}
          drafts={drafts}
          names={names}
          pending={addActions.isPending}
          onChange={(key, patch) => setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))}
          onAdd={add}
          onRestart={restart}
        />
      ) : stage === 'error' ? (
        <ErrorState error={error} onRetry={restart} className="px-0 py-0" />
      ) : stage === 'processing' ? (
        <p role="status" className="flex animate-page-in items-center gap-3 text-base">
          <AudioLines className="size-5 text-accent motion-safe:animate-pulse" aria-hidden />
          Echo analyse l’enregistrement…
        </p>
      ) : stage === 'recording' ? (
        <div className="flex animate-page-in flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 text-base" role="status">
            <span className="size-3 rounded-full bg-danger motion-safe:animate-pulse" aria-hidden />
            Enregistrement en cours
            <span className="tabular text-fg-muted">{clock(seconds)}</span>
          </span>
          <Button variant="primary" onClick={stop}>
            <Square aria-hidden />
            Terminer
          </Button>
          <span className="w-full text-xs text-fg-subtle">Arrêt automatique à {ECHO_MAX_SECONDS / 60} minutes.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-3 text-base">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" />
            <span>
              {collaborator} est d’accord pour être enregistré(e).
              <span className="block text-sm text-fg-muted">Ni l’audio ni la transcription ne sont conservés : seules les actions que vous validez sont enregistrées.</span>
            </span>
          </label>
          <Button variant="primary" className="self-start" disabled={!consent} onClick={() => void start()}>
            <Mic aria-hidden />
            Enregistrer avec Echo
          </Button>
        </div>
      )}
    </Panel>
  );
}
