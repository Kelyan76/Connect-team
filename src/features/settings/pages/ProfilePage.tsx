import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updatePassword } from '@/features/auth/api';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/lib/password';
import { BackupPanel } from '@/features/settings/components/BackupPanel';
import { toUserMessage } from '@/shared/lib/errors';
import { formatDate, fullName } from '@/shared/lib/format';
import { isLocalBackend } from '@/shared/lib/supabase';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { DescriptionList, Page, PageHeader, Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';

export default function ProfilePage() {
  const { profile, team, isManager } = useCurrentUser();
  const { signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      form.reset();
      toast.success('Mot de passe modifié');
    } catch (e) {
      setError(toUserMessage(e));
    }
  });

  const resetDemo = async () => {
    const { resetLocalDatabase } = await import('@/backend/local/db');
    await signOut();
    await resetLocalDatabase();
    window.location.reload();
  };

  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: 'Mon profil' }]} title="Mon profil" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Identité">
          <div className="flex items-start gap-4">
            <Avatar person={profile} size="lg" />
            <DescriptionList
              items={[
                { label: 'Nom', value: fullName(profile) },
                { label: 'E-mail', value: <span className="break-all">{profile.email}</span> },
                { label: 'Poste', value: profile.job_title },
                { label: 'Rôle', value: isManager ? 'Manager' : 'Collaborateur' },
                { label: 'Entreprise', value: team.company },
                { label: 'Arrivée', value: profile.hired_on ? formatDate(profile.hired_on) : '—' },
              ]}
            />
          </div>
        </Panel>
        <Panel title="Changer de mot de passe" description="10 caractères minimum, avec majuscule, chiffre et caractère spécial.">
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Field label="Nouveau mot de passe" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('password')} />
            </Field>
            <Field label="Confirmation" error={form.formState.errors.confirm?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
            </Field>
            <Button type="submit" variant="primary" className="self-start" disabled={form.formState.isSubmitting}>
              Mettre à jour
            </Button>
          </form>
        </Panel>
      </div>
      {!isManager && (
        <div className="mt-6">
          <BackupPanel />
        </div>
      )}
      {isLocalBackend && (
        <Panel title="Données de démonstration" description="Les données de cette démonstration sont stockées dans ce navigateur." className="mt-6">
          <Button onClick={() => setResetting(true)}>
            <RotateCcw aria-hidden />
            Réinitialiser la démonstration
          </Button>
        </Panel>
      )}
      <ConfirmDialog
        open={resetting}
        onOpenChange={setResetting}
        title="Réinitialiser la démonstration ?"
        description="Toutes vos modifications seront effacées et le jeu de données d’origine rechargé. Vous serez déconnecté."
        confirmLabel="Réinitialiser"
        onConfirm={() => void resetDemo()}
      />
    </Page>
  );
}
