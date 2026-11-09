import { ArrowRight, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReviews } from '@/features/reviews/queries';
import { useTeamMembers } from '@/features/team/queries';
import { daysFromToday } from '@/shared/lib/dates';
import { formatTime, relativeDays } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';

/** Rappel sur l'accueil du collaborateur : son prochain 1 à 1 approche et il ne l'a pas préparé. */
export function PrepNudge() {
  const reviews = useReviews();
  const team = useTeamMembers();
  const next = reviews.data
    ?.filter((r) => r.kind === 'one_to_one' && r.status === 'planifie' && !r.collaborator_prepared_at)
    .map((r) => ({ r, days: daysFromToday(r.scheduled_at.slice(0, 10)) }))
    .filter((x) => x.days >= 0 && x.days <= 7)
    .sort((a, b) => a.days - b.days)[0];
  if (!next) return null;
  const manager = team.byId.get(next.r.manager_id)?.first_name ?? 'votre manager';

  return (
    <section className="mb-6 flex animate-page-in flex-wrap items-center gap-4 rounded-lg border border-sec-reviews/20 bg-gradient-to-r from-sec-reviews/10 to-surface p-4 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded bg-sec-reviews text-white shadow-sm">
        <MessageSquareText className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium">
          Votre 1 à 1 avec {manager} : {relativeDays(next.days)} à {formatTime(next.r.scheduled_at)}
        </span>
        <span className="text-sm text-fg-muted">Choisissez vos sujets en 2 minutes : c’est votre moment.</span>
      </span>
      <Button asChild variant="primary" className="w-full sm:w-auto">
        <Link to={`/entretiens/${next.r.id}`}>
          Préparer
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
