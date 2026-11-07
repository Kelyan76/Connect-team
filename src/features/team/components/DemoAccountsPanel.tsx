import { Check, Copy, Loader2, LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { switchToDemoAccount } from '@/features/auth/demo-switch';
import { toUserMessage } from '@/shared/lib/errors';
import { fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { useDemoAccounts, useTeamMembers } from '../queries';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      // presse-papiers indisponible : la valeur reste sélectionnable à l'écran
    }
  };
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => void copy()} aria-label={label}>
      {done ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}

/**
 * Comptes collaborateurs fictifs de l'équipe : connexion en un clic pour tester l'application
 * côté collaborateur (le bandeau du haut permet ensuite de revenir au compte manager).
 */
export function DemoAccountsPanel() {
  const { profile } = useCurrentUser();
  const accounts = useDemoAccounts();
  const team = useTeamMembers();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = (accounts.data ?? []).flatMap((a) => {
    const person = team.byId.get(a.user_id);
    return person ? [{ person, password: a.password }] : [];
  });

  useEffect(() => {
    if (hash === '#comptes-demo' && rows.length > 0) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, rows.length]);

  if (rows.length === 0) return null;
  const password = rows[0].password;

  const connect = async (email: string, name: string, pwd: string) => {
    setBusy(email);
    try {
      await switchToDemoAccount(email, pwd, profile.first_name);
      navigate('/', { replace: true });
      toast.success(`Connecté en tant que ${name}`);
    } catch (e) {
      toast.error(toUserMessage(e));
      setBusy(null);
    }
  };

  return (
    <div ref={ref} id="comptes-demo" className="mt-6 scroll-mt-20">
      <Panel
        title="Tester en tant que collaborateur"
        description="Comptes de démonstration de votre équipe : connexion en un clic."
        flush
      >
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3 text-sm">
          <span className="text-fg-muted">Mot de passe commun</span>
          <code className="rounded bg-surface-muted px-2 py-1 font-medium text-fg">{password}</code>
          <CopyButton value={password} label="Copier le mot de passe" />
        </div>
        <ul className="stagger divide-y divide-line border-t border-line">
          {rows.map(({ person, password: pwd }) => (
            <li key={person.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar person={person} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-medium">{fullName(person)}</span>
                <span className="flex min-w-0 items-center gap-1 text-xs text-fg-subtle">
                  <span className="truncate">{person.email}</span>
                  <CopyButton value={person.email} label={`Copier l’adresse de ${fullName(person)}`} />
                </span>
              </span>
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== null}
                onClick={() => void connect(person.email, fullName(person), pwd)}
              >
                {busy === person.email ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
                <span className="hidden sm:inline">Se connecter</span>
                <span className="sm:hidden">Tester</span>
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
