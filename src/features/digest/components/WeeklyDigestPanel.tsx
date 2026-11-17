import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  CalendarClock,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Smile,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { actionLink } from '@/features/ai/lib/assistant';
import { WEEKLY_KEYS, type WeeklyDigest } from '@/features/ai/lib/weekly';
import { useAssistantData } from '@/features/ai/use-assistant-data';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { isoWeekLabel, todayIso, weekStartIso } from '@/shared/lib/dates';
import { toUserMessage } from '@/shared/lib/errors';
import { formatDate } from '@/shared/lib/format';
import { qk } from '@/shared/lib/query-keys';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { generateWeeklyDigest, getWeeklyDigest } from '../api';

const LINES: Record<keyof WeeklyDigest, { label: string; icon: LucideIcon; tone: string }> = {
  bien: { label: 'Ce qui va bien', icon: Smile, tone: 'bg-success-subtle text-success' },
  priorite: { label: 'À voir en priorité', icon: Target, tone: 'bg-danger-subtle text-danger' },
  echeances: { label: 'Échéances', icon: CalendarClock, tone: 'bg-warning-subtle text-warning' },
  reconnaissance: {
    label: 'Reconnaissance à faire',
    icon: Award,
    tone: 'bg-sec-reviews/10 text-sec-reviews',
  },
  conseil: {
    label: 'Conseil de la semaine',
    icon: Lightbulb,
    tone: 'bg-accent-subtle text-accent',
  },
};

/**
 * « La semaine de l'équipe » : 5 lignes rédigées par l'IA à la première ouverture de la semaine,
 * puis gardées en base (une seule demande à l'IA par semaine et par équipe).
 */
export function WeeklyDigestPanel() {
  const { profile, team } = useCurrentUser();
  const qc = useQueryClient();
  const { data, people, ready } = useAssistantData();
  const week = weekStartIso(todayIso());
  const key = qk.weeklyDigest(week);
  const stored = useQuery({ queryKey: key, queryFn: () => getWeeklyDigest(team.id, week) });
  const generate = useMutation({
    mutationFn: () =>
      generateWeeklyDigest({
        teamId: team.id,
        weekStart: week,
        weekLabel: isoWeekLabel(week, true),
        managerFirstName: profile.first_name,
        data,
      }),
    onSuccess: (d) => qc.setQueryData(key, d),
  });
  const asked = useRef(false);

  // Première ouverture de la semaine : on rédige le résumé une fois, automatiquement.
  useEffect(() => {
    if (asked.current || !ready || stored.isLoading || stored.data !== null || stored.error) return;
    asked.current = true;
    generate.mutate();
  }, [ready, stored.isLoading, stored.data, stored.error, generate]);

  const digest = stored.data?.digest;
  return (
    <Panel
      title={`La semaine de l’équipe · ${isoWeekLabel(week)}`}
      description="Rédigée par l’IA une fois par semaine, à partir du pouls, des tâches et des 1 à 1."
      actions={
        digest && (
          <Button
            size="sm"
            variant="ghost"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            aria-label="Actualiser le résumé"
          >
            <RefreshCw
              className={cn(generate.isPending && 'motion-safe:animate-spin')}
              aria-hidden
            />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        )
      }
    >
      {digest ? (
        <ul className="stagger flex flex-col gap-3">
          {WEEKLY_KEYS.map((k) => {
            const meta = LINES[k];
            const line = digest[k];
            const link =
              k === 'priorite' && line.person
                ? actionLink({ type: 'review', person: line.person }, people)
                : k === 'reconnaissance' && line.person
                  ? actionLink(
                      { type: 'feedback', person: line.person, kind: 'reconnaissance' },
                      people,
                    )
                  : null;
            return (
              <li key={k} className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded',
                    meta.tone,
                  )}
                >
                  <meta.icon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-fg-subtle">{meta.label}</span>
                  <span className="text-base">{line.text}</span>
                  {link && (
                    <Link
                      to={link.to}
                      className="flex w-fit items-center gap-1 text-sm font-medium text-accent hover:underline"
                    >
                      {link.label}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
          {stored.data && (
            <li className="text-xs text-fg-subtle">
              Rédigé le {formatDate(stored.data.createdAt)} · à relire : l’IA peut se tromper.
            </li>
          )}
        </ul>
      ) : generate.isError || stored.error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-fg-muted">{toUserMessage(generate.error ?? stored.error)}</p>
          <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" role="status">
          <span className="flex items-center gap-2 text-sm text-fg-muted">
            <Sparkles className="size-4 text-sec-reviews motion-safe:animate-pulse" aria-hidden />
            L’IA prépare le résumé de la semaine…
          </span>
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      )}
    </Panel>
  );
}
