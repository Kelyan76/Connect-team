import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { fullName } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
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
    <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label={label}>
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}

/** Comptes collaborateurs fictifs de l'équipe : pour découvrir l'application côté collaborateur. */
export function DemoAccountsPanel() {
  const accounts = useDemoAccounts();
  const team = useTeamMembers();
  const rows = (accounts.data ?? []).flatMap((a) => {
    const person = team.byId.get(a.user_id);
    return person ? [{ person, password: a.password }] : [];
  });
  if (rows.length === 0) return null;
  const password = rows[0].password;

  return (
    <Panel
      title="Comptes de démonstration"
      description="Déconnectez-vous puis connectez-vous avec l’un de ces comptes pour voir l’application côté collaborateur."
      flush
      className="mt-6"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 text-sm">
        <span className="text-fg-muted">Mot de passe commun</span>
        <code className="rounded bg-surface-muted px-2 py-0.5 font-medium text-fg">{password}</code>
        <CopyButton value={password} label="Copier le mot de passe" />
      </div>
      <ul className="divide-y divide-line">
        {rows.map(({ person }) => (
          <li key={person.id} className="flex items-center gap-3 px-4 py-2">
            <PersonLabel person={person} detail={person.job_title} />
            <span className="ml-auto truncate text-sm text-fg-muted">{person.email}</span>
            <CopyButton value={person.email} label={`Copier l’adresse de ${fullName(person)}`} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
