import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { openLocalEmailLink } from '../api';
import { AuthLayout } from '../components/AuthLayout';

/** Ouverture d'un lien reçu par e-mail dans la démonstration (invitation ou réinitialisation). */
export default function EmailLinkPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openLocalEmailLink(params.get('type') ?? '', params.get('token') ?? '')
      .then(() => navigate('/nouveau-mot-de-passe', { replace: true }))
      .catch((e: unknown) => setError(toUserMessage(e)));
  }, [params, navigate]);

  if (error) {
    return (
      <AuthLayout title="Lien invalide" description={error}>
        <Button asChild variant="primary">
          <Link to="/connexion">Retour à la connexion</Link>
        </Button>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Vérification du lien…">
      <Skeleton className="h-8 w-full" />
    </AuthLayout>
  );
}
