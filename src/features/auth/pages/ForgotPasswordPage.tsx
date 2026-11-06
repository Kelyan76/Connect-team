import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toUserMessage } from '@/shared/lib/errors';
import { isLocalBackend } from '@/shared/lib/supabase';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { sendPasswordReset } from '../api';
import { AuthLayout } from '../components/AuthLayout';

const schema = z.object({ email: z.string().trim().email('Adresse e-mail invalide.') });

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ email: string }>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (e) {
      setError(toUserMessage(e));
    }
  });

  if (sentTo) {
    return (
      <AuthLayout
        title="Vérifiez votre boîte mail"
        description={`Si un compte existe pour ${sentTo}, un lien de réinitialisation vient d’être envoyé. Il n’est valable qu’une fois.`}
      >
        {isLocalBackend && (
          <Button asChild variant="primary">
            <Link to="/boite-mail">Ouvrir la boîte mail de démonstration</Link>
          </Button>
        )}
        <Link to="/connexion" className="text-sm text-accent hover:underline">
          Retour à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Mot de passe oublié" description="Saisissez votre adresse : nous vous envoyons un lien pour choisir un nouveau mot de passe.">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Field label="Adresse e-mail" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus {...form.register('email')} />
        </Field>
        <Button type="submit" variant="primary" size="lg" disabled={form.formState.isSubmitting}>
          Envoyer le lien
        </Button>
        <Link to="/connexion" className="text-sm text-accent hover:underline">
          Retour à la connexion
        </Link>
      </form>
    </AuthLayout>
  );
}
