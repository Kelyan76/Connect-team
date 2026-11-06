import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { mailbox } from '@/backend/local/mailbox';
import { formatDateTime } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/feedback';
import { BrandMark } from '@/shared/ui/brand';

/** Boîte mail de démonstration : remplace Inbucket/Mailpit, les e-mails ne quittent pas le navigateur. */
export default function MailboxPage() {
  const mails = useSyncExternalStore(mailbox.subscribe, mailbox.list);
  return (
    <div className="min-h-screen bg-canvas px-6 py-8">
      <div className="mx-auto flex max-w-180 flex-col gap-6">
        <div className="flex items-center gap-2">
          <BrandMark className="size-6" />
          <h1 className="text-lg font-semibold">Boîte mail de démonstration</h1>
          <Link to="/connexion" className="ml-auto text-sm text-accent hover:underline">
            Retour à la connexion
          </Link>
        </div>
        <p className="text-sm text-fg-muted">
          Les invitations et les liens de réinitialisation envoyés pendant cette session apparaissent ici. Avec un projet Supabase,
          ils partent par e-mail.
        </p>
        <section className="rounded-lg border border-line bg-surface">
          {mails.length === 0 ? (
            <EmptyState
              title="Aucun e-mail pour l’instant"
              description="Demandez une réinitialisation de mot de passe ou invitez un collaborateur depuis la page Collaborateurs."
            />
          ) : (
            <ul className="divide-y divide-line">
              {mails.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-base font-medium">{m.subject}</span>
                    <span className="text-xs text-fg-subtle">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <span className="text-xs text-fg-subtle">À : {m.to}</span>
                  <p className="text-base text-fg-muted">{m.body}</p>
                  <Link to={m.link} className="self-start text-sm font-medium text-accent hover:underline">
                    Ouvrir le lien
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
