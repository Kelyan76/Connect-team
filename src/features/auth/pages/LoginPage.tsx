import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { toUserMessage } from '@/shared/lib/errors';
import { isLocalBackend } from '@/shared/lib/supabase';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { signIn } from '../api';
import { useAuth } from '../AuthProvider';
import { AuthLayout } from '../components/AuthLayout';
import { DemoAccounts } from '../components/DemoAccounts';

const schema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { state } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  if (state.status === 'signed_in') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signIn(values.email, values.password);
    } catch (e) {
      setError(toUserMessage(e));
    }
  });

  const fill = (email: string, password: string) => {
    form.setValue('email', email, { shouldValidate: true });
    form.setValue('password', password, { shouldValidate: true });
  };

  return (
    <AuthLayout
      title="Connexion"
      description="Accédez au pilotage de votre équipe."
      aside={isLocalBackend ? <DemoAccounts onPick={fill} /> : undefined}
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" className="rounded border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Field label="Adresse e-mail" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="username" autoFocus {...form.register('email')} />
        </Field>
        <Field label="Mot de passe" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <div className="flex items-center justify-between">
          <Link to="/mot-de-passe-oublie" className="text-sm text-accent hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
        <div className="flex flex-col gap-1 border-t border-line pt-4">
          <p className="text-sm text-fg-muted">
            Manager, pas encore de compte ?{' '}
            <Link to="/inscription" className="font-medium text-accent hover:underline">
              Créer un compte
            </Link>
          </p>
          <p className="text-xs text-fg-subtle">Collaborateur : votre manager vous envoie une invitation par e-mail.</p>
        </div>
      </form>
    </AuthLayout>
  );
}
