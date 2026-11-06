import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toaster';
import { updatePassword } from '../api';
import { useAuth } from '../AuthProvider';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordRules } from '../components/PasswordRules';
import { newPasswordSchema, type NewPasswordValues } from '../lib/password';

/** Définition du mot de passe : après une invitation ou une demande de réinitialisation. */
export default function NewPasswordPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });
  const value = form.watch('password');

  if (!session) {
    return (
      <AuthLayout title="Lien invalide" description="Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel e-mail.">
        <Button asChild variant="primary">
          <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        </Button>
      </AuthLayout>
    );
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      toast.success('Mot de passe enregistré');
      navigate('/', { replace: true });
    } catch (e) {
      setError(toUserMessage(e));
    }
  });

  return (
    <AuthLayout title="Choisissez votre mot de passe" description={`Compte : ${session.user.email ?? ''}`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Field label="Nouveau mot de passe" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" autoFocus {...form.register('password')} />
        </Field>
        <PasswordRules value={value} />
        <Field label="Confirmation" error={form.formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
        </Field>
        <Button type="submit" variant="primary" size="lg" disabled={form.formState.isSubmitting}>
          Enregistrer et continuer
        </Button>
      </form>
    </AuthLayout>
  );
}
