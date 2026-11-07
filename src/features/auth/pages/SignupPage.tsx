import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toUserMessage } from '@/shared/lib/errors';
import { isLocalBackend } from '@/shared/lib/supabase';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toaster';
import { signUpManager } from '../api';
import { useAuth } from '../AuthProvider';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordRules } from '../components/PasswordRules';
import { LOCAL_SIGNUP_CODE, signupSchema, type SignupValues } from '../lib/signup';

const EMPTY: SignupValues = {
  code: '',
  first_name: '',
  last_name: '',
  job_title: '',
  company: '',
  team_name: '',
  email: '',
  password: '',
};

function Aside() {
  return (
    <div className="flex max-w-100 flex-col gap-4">
      <h2 className="text-md font-semibold">Votre espace, prêt à l’emploi</h2>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="font-medium text-fg">Une équipe de démonstration</dt>
          <dd className="text-fg-muted">
            Collaborateurs fictifs, objectifs, tâches et entretiens déjà renseignés pour explorer
            l’outil.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-fg">Des comptes collaborateurs</dt>
          <dd className="text-fg-muted">
            Leurs identifiants sont dans Équipe : connectez-vous avec pour voir l’application côté
            collaborateur.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-fg">Vos données à part</dt>
          <dd className="text-fg-muted">
            Chaque manager a sa propre équipe : personne d’autre n’y a accès.
          </dd>
        </div>
      </dl>
      {isLocalBackend && (
        <p className="text-xs text-fg-subtle">
          Démonstration locale : code d’accès{' '}
          <span className="font-medium text-fg">{LOCAL_SIGNUP_CODE}</span>
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: EMPTY });
  const password = form.watch('password');
  const errors = form.formState.errors;

  if (state.status === 'signed_in' && !form.formState.isSubmitting)
    return <Navigate to="/" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await signUpManager(values);
      toast.success('Votre équipe de démonstration est prête');
      navigate('/', { replace: true });
    } catch (e) {
      setError(toUserMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Créer un compte manager"
      description="Votre équipe est créée en quelques secondes."
      aside={<Aside />}
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error && (
          <p
            role="alert"
            className="rounded border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <Field
          label="Code d’accès"
          hint="Fourni par le responsable de votre groupe."
          error={errors.code?.message}
        >
          <Input autoComplete="off" autoFocus {...form.register('code')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={errors.first_name?.message}>
            <Input autoComplete="given-name" {...form.register('first_name')} />
          </Field>
          <Field label="Nom" error={errors.last_name?.message}>
            <Input autoComplete="family-name" {...form.register('last_name')} />
          </Field>
        </div>
        <Field label="Fonction" error={errors.job_title?.message}>
          <Input
            autoComplete="organization-title"
            placeholder="Responsable d’équipe"
            {...form.register('job_title')}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entreprise" error={errors.company?.message}>
            <Input autoComplete="organization" {...form.register('company')} />
          </Field>
          <Field label="Équipe" error={errors.team_name?.message}>
            <Input placeholder="Opérations" {...form.register('team_name')} />
          </Field>
        </div>
        <Field label="Adresse e-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Mot de passe" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <PasswordRules value={password} />
        <Button type="submit" variant="primary" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Création de votre équipe…
            </>
          ) : (
            'Créer mon compte'
          )}
        </Button>
        <p className="text-sm text-fg-muted">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
