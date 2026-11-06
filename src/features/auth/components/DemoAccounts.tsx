import { Avatar } from '@/shared/ui/avatar';
import { useDemoReady } from '../use-demo-ready';

/** Comptes du jeu de démonstration (supabase/seed.sql). Affichés uniquement sur le backend embarqué. */
export const DEMO_PASSWORD = 'Cadence-Demo26!';

const ACCOUNTS = [
  { first_name: 'Claire', last_name: 'Vasseur', email: 'claire.vasseur@valmont-equipements.fr', role: 'Manager', job: 'Responsable des opérations' },
  { first_name: 'Nadia', last_name: 'Haddad', email: 'nadia.haddad@valmont-equipements.fr', role: 'Collaboratrice', job: 'Technicienne de mise en service' },
  { first_name: 'Julien', last_name: 'Mercier', email: 'julien.mercier@valmont-equipements.fr', role: 'Collaborateur', job: 'Technicien SAV' },
  { first_name: 'Karim', last_name: 'Benali', email: 'karim.benali@valmont-equipements.fr', role: 'Collaborateur', job: "Chargé d'affaires" },
];

export function DemoAccounts({ onPick }: { onPick: (email: string, password: string) => void }) {
  const ready = useDemoReady();
  return (
    <div className="flex max-w-100 flex-col gap-4">
      <p className="flex items-center gap-2 text-xs text-fg-subtle" role="status">
        <span className={ready === 'prete' ? 'size-2 rounded-full bg-success' : ready === 'erreur' ? 'size-2 rounded-full bg-danger' : 'size-2 animate-[pulse_1.6s_ease-in-out_infinite] rounded-full bg-warning'} aria-hidden />
        {ready === 'prete'
          ? 'Base de démonstration prête'
          : ready === 'erreur'
            ? 'La base de démonstration n’a pas pu démarrer. Rechargez la page.'
            : 'Préparation de la base de démonstration (premier lancement : quelques secondes)…'}
      </p>
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold">Comptes de démonstration</h2>
        <p className="text-sm text-fg-muted">
          Choisissez un profil pour remplir le formulaire. Les données sont celles d’une PME fictive et restent dans ce
          navigateur. Mot de passe commun : <span className="font-medium text-fg">{DEMO_PASSWORD}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              className="flex w-full items-center gap-3 rounded border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-canvas"
            >
              <Avatar person={a} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-medium">
                  {a.first_name} {a.last_name}
                </span>
                <span className="truncate text-xs text-fg-subtle">{a.job}</span>
              </span>
              <span className="text-xs text-fg-muted">{a.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
