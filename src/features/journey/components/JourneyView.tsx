import { Award, BookOpenCheck, CheckCheck, Copy, GitFork, MessageSquareText, Target, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { formatDate, formatPercent } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/data';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { annualSummary, byMonth, JOURNEY_KIND, JOURNEY_ORDER, journeyTotals, type JourneyKind } from '../lib/journey';
import { useJourney } from '../queries';

const ICON: Record<JourneyKind, { icon: LucideIcon; tone: string }> = {
  reconnaissance: { icon: Award, tone: 'bg-success-subtle text-success' },
  objectif: { icon: Target, tone: 'bg-sec-goals/10 text-sec-goals' },
  mission: { icon: GitFork, tone: 'bg-sec-meetings/10 text-sec-meetings' },
  competence: { icon: BookOpenCheck, tone: 'bg-sec-team/10 text-sec-team' },
  engagement: { icon: CheckCheck, tone: 'bg-accent-subtle text-accent' },
  entretien: { icon: MessageSquareText, tone: 'bg-sec-reviews/10 text-sec-reviews' },
};

const monthLabel = (month: string) => {
  const s = new Date(`${month}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Parcours d'une personne : chiffres clés, objectifs en cours, frise des réussites mois par mois. */
export function JourneyView({ personId, self }: { personId: string; self: boolean }) {
  const { events, inProgress } = useJourney(personId);
  const [kind, setKind] = useState<'tout' | JourneyKind>('tout');

  if (!events) return <Skeleton className="h-96" />;
  const totals = journeyTotals(events);
  const shown = events.filter((e) => kind === 'tout' || e.kind === kind);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(annualSummary(events, isoAddDays(todayIso(), -365)));
      toast.success('Résumé copié : collez-le dans la préparation de votre entretien annuel');
    } catch {
      toast.error('Copie impossible sur ce navigateur');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ul className="stagger grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {JOURNEY_ORDER.map((k) => {
          const I = ICON[k].icon;
          return (
            <li key={k} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-2 shadow-sm sm:gap-2 sm:p-3">
              <span className={cn('flex size-7 items-center justify-center rounded-full sm:size-8', ICON[k].tone)}>
                <I className="size-4" aria-hidden />
              </span>
              <span className="tabular text-lg font-semibold sm:text-xl">{totals[k]}</span>
              <span className="text-xs leading-tight text-fg-muted">{JOURNEY_KIND[k].plural}</span>
            </li>
          );
        })}
      </ul>

      {inProgress.length > 0 && (
        <Panel title={self ? 'Mes objectifs en cours' : 'Objectifs en cours'}>
          <ul className="flex flex-col gap-3">
            {inProgress.map((o) => (
              <li key={o.id} className="flex flex-col gap-1">
                <span className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{o.title}</span>
                  <span className="tabular font-medium">{formatPercent(o.progress)}</span>
                </span>
                <ProgressBar value={o.progress} label={`Avancement de ${o.title}`} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title={self ? 'Mes réussites, mois par mois' : 'Ses réussites, mois par mois'}
        description={self ? 'Tout ce que vous avez accompli et ce qui a été reconnu.' : 'Reconnaissances partagées, missions, compétences et engagements tenus.'}
      >
        <div className="flex flex-col gap-5">
          <Button size="sm" className="self-start" onClick={() => void copy()}>
            <Copy aria-hidden />
            {self ? 'Préparer mon entretien annuel' : 'Copier le résumé annuel'}
          </Button>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented value={kind} onValueChange={(v) => setKind(v as typeof kind)} aria-label="Type de réussite">
              <SegmentedItem value="tout">Tout</SegmentedItem>
              {JOURNEY_ORDER.filter((k) => totals[k] > 0).map((k) => (
                <SegmentedItem key={k} value={k}>
                  {JOURNEY_KIND[k].label}
                </SegmentedItem>
              ))}
            </Segmented>
          </div>
          {shown.length === 0 ? (
            <EmptyState title="Pas encore de réussite ici" description="Vos reconnaissances, missions réussies et engagements tenus apparaîtront ici au fil des semaines." />
          ) : (
            byMonth(shown).map((g) => (
              <section key={g.month} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-fg-muted">{monthLabel(g.month)}</h3>
                <ol className="stagger flex flex-col gap-3 border-l-2 border-line pl-4">
                  {g.events.map((e) => {
                    const I = ICON[e.kind].icon;
                    return (
                      <li key={e.id} className="relative flex gap-3">
                        <span className={cn('absolute -left-8 flex size-7 items-center justify-center rounded-full ring-4 ring-surface', ICON[e.kind].tone)}>
                          <I className="size-4" aria-hidden />
                        </span>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-xs text-fg-subtle">
                            {JOURNEY_KIND[e.kind].label} · {formatDate(e.date)}
                          </span>
                          <span className="text-base font-medium">{e.title}</span>
                          {e.detail && <span className="text-sm text-fg-muted">{e.detail}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
