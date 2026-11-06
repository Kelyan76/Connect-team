import { MessageSquareText, Target, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { useObjectives } from '@/features/objectives/queries';
import { KIND_LABEL } from '@/features/reviews/lib/review-rules';
import { useReviews } from '@/features/reviews/queries';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, fullName } from '@/shared/lib/format';
import type { PaletteEntry } from './CommandPalette';

/** Éléments proposés par la recherche globale (Ctrl/Cmd+K), limités à ce que l'utilisateur peut voir. */
export function useSearchEntries(isManager: boolean): PaletteEntry[] {
  const team = useTeamMembers();
  const objectives = useObjectives();
  const reviews = useReviews();

  return useMemo(() => {
    const entries: PaletteEntry[] = [];
    if (isManager) {
      for (const p of team.members) {
        entries.push({ id: `p-${p.id}`, group: 'Collaborateurs', label: fullName(p), detail: p.job_title, to: `/equipe/${p.id}`, icon: UserRound });
      }
    }
    for (const o of objectives.data ?? []) {
      const owner = o.owner_id ? team.byId.get(o.owner_id) : null;
      entries.push({ id: `o-${o.id}`, group: 'Objectifs', label: o.title, detail: owner ? fullName(owner) : 'Équipe', to: '/objectifs', icon: Target });
    }
    for (const r of (reviews.data ?? []).filter((x) => x.status === 'planifie')) {
      const who = team.byId.get(r.collaborator_id);
      entries.push({
        id: `r-${r.id}`,
        group: 'Entretiens à venir',
        label: `${KIND_LABEL[r.kind]}${who && isManager ? ` · ${fullName(who)}` : ''}`,
        detail: formatDate(r.scheduled_at),
        to: `/entretiens/${r.id}`,
        icon: MessageSquareText,
      });
    }
    return entries;
  }, [isManager, team.members, team.byId, objectives.data, reviews.data]);
}
