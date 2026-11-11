import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { Button } from '@/shared/ui/button';

/** Invitation au test DISC sur l'accueil du collaborateur, tant qu'il n'a pas de profil. */
export function DiscNudge() {
  const { profile } = useCurrentUser();
  const discs = useDiscProfiles();
  if (!discs.data || discs.data.some((d) => d.collaborator_id === profile.id)) return null;

  return (
    <section className="mb-6 flex animate-page-in flex-wrap items-center gap-4 rounded-lg border border-accent/20 bg-gradient-to-r from-accent-subtle to-surface p-4 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded bg-accent text-white shadow-sm">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium">Découvrez votre style de communication</span>
        <span className="text-sm text-fg-muted">Test DISC en 2 minutes : votre manager saura comment échanger au mieux avec vous.</span>
      </span>
      <Button asChild variant="primary" className="w-full sm:w-auto">
        <Link to="/mon-style">
          Faire le test
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
