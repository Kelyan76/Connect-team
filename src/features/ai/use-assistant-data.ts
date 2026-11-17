import { useMemo } from 'react';
import { useAbsences } from '@/features/absences/queries';
import { ALERT_KIND_LABEL } from '@/features/alerts/lib/alerts';
import { useAlerts } from '@/features/alerts/queries';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useObjectives } from '@/features/objectives/queries';
import { usePulses } from '@/features/pulse/queries';
import { useReviews } from '@/features/reviews/queries';
import { useTasks } from '@/features/tasks/queries';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { DISC, type DiscStyle } from '@/features/team/lib/disc';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { formatDate, formatPercent } from '@/shared/lib/format';
import type { PersonRef } from './lib/assistant';

const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

/**
 * Résumé des données de suivi transmis à l'assistant : prénoms uniquement (jamais de nom de famille ni d'e-mail),
 * chiffres agrégés. Pour un collaborateur, uniquement ses propres données.
 */
export function useAssistantData(): { data: string; people: PersonRef[]; ready: boolean } {
  const { profile, isManager } = useCurrentUser();
  const team = useTeamMembers();
  const alerts = useAlerts();
  const pulses = usePulses();
  const reviews = useReviews();
  const objectives = useObjectives();
  const tasks = useTasks();
  const discs = useDiscProfiles();
  const absences = useAbsences();

  return useMemo(() => {
    const today = todayIso();
    const weekAgo = isoAddDays(today, -7);
    const people = isManager
      ? team.active.filter((p) => p.id !== profile.id)
      : [
          {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            job_title: profile.job_title,
          },
        ];
    const anonymise = (s: string) =>
      people.reduce((acc, p) => acc.split(`${p.first_name} ${p.last_name}`).join(p.first_name), s);
    const lines: string[] = [];

    for (const p of people) {
      const disc = discs.data?.find((d) => d.collaborator_id === p.id);
      const style = disc
        ? `DISC ${disc.primary_style} (${DISC[disc.primary_style as DiscStyle].name})`
        : 'DISC non renseigné';
      const mine = (pulses.data ?? []).filter(
        (x) => x.collaborator_id === p.id && x.day >= weekAgo,
      );
      const mood = avg(mine.map((x) => x.mood));
      const load = avg(mine.flatMap((x) => (x.workload ? [x.workload] : [])));
      const next = (reviews.data ?? [])
        .filter(
          (r) =>
            r.collaborator_id === p.id &&
            r.status === 'planifie' &&
            r.scheduled_at.slice(0, 10) >= today,
        )
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
      const late = (tasks.data ?? []).filter(
        (t) =>
          t.assignee_id === p.id &&
          t.status !== 'termine' &&
          t.due_date !== null &&
          t.due_date < today,
      );
      const objs = (objectives.data ?? []).filter((o) => o.owner_id === p.id);
      lines.push(
        [
          `- ${p.first_name} (${p.job_title}, ${style})`,
          mood !== null ? `humeur moyenne 7 j : ${mood}/5` : 'pas de pouls cette semaine',
          load !== null ? `charge ressentie : ${load}/5` : null,
          next ? `prochain 1 à 1 : ${formatDate(next.scheduled_at)}` : 'aucun 1 à 1 planifié',
          late.length
            ? `${late.length} tâche(s) en retard (${late
                .slice(0, 2)
                .map((t) => t.title)
                .join(' ; ')})`
            : null,
          objs.length
            ? `objectifs : ${objs.map((o) => `« ${o.title} » ${formatPercent(o.progress)} ${OBJECTIVE_STATUS[o.status].label.toLowerCase()}`).join(' ; ')}`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
      );
    }

    if (isManager) {
      const signals = (alerts.data ?? [])
        .slice(0, 12)
        .map(
          (a) =>
            `- ${ALERT_KIND_LABEL[a.kind]} : ${anonymise(a.title)}${a.detail ? ` (${anonymise(a.detail)})` : ''}`,
        );
      if (signals.length) lines.push('', 'Signaux faibles :', ...signals);
      const pending = (absences.data ?? []).filter((a) => a.status === 'en_attente').length;
      if (pending) lines.push('', `${pending} demande(s) de congé en attente de validation.`);
      const team_ = (objectives.data ?? []).filter((o) => !o.owner_id);
      if (team_.length)
        lines.push(
          '',
          `Objectifs d’équipe : ${team_.map((o) => `« ${o.title} » ${formatPercent(o.progress)}`).join(' ; ')}`,
        );
    }

    const ready = !!(team.data && pulses.data && reviews.data && objectives.data && tasks.data);
    return {
      data: lines.join('\n').slice(0, 6000),
      people: people.map((p) => ({ id: p.id, first_name: p.first_name })),
      ready,
    };
  }, [
    isManager,
    profile,
    team.active,
    team.data,
    alerts.data,
    pulses.data,
    reviews.data,
    objectives.data,
    tasks.data,
    discs.data,
    absences.data,
  ]);
}
