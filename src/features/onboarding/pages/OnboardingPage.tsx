import {
  ArrowRight,
  BellRing,
  Check,
  Compass,
  Grid3x3,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { usePushState } from '@/features/notifications/queries';
import { SelfAssessment } from '@/features/skills/components/SelfAssessment';
import { useSkillLevels, useSkills } from '@/features/skills/queries';
import { DiscQuiz } from '@/features/team/components/DiscQuiz';
import { cn } from '@/shared/lib/cn';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { Page, Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { minSelfAssessed, stepsToShow, type OnboardingStep } from '../lib/onboarding';
import { useOnboardingStatus } from '../use-onboarding';

const META: Record<OnboardingStep, { label: string; icon: typeof Sparkles }> = {
  bienvenue: { label: 'Bienvenue', icon: Sparkles },
  disc: { label: 'Mon style', icon: Compass },
  competences: { label: 'Mes compétences', icon: Grid3x3 },
  notifications: { label: 'Notifications', icon: BellRing },
};

/** Parcours de bienvenue : quelques minutes pour compléter son profil (DISC, compétences), puis notifications. */
export default function OnboardingPage() {
  const { profile, isManager } = useCurrentUser();
  const navigate = useNavigate();
  const status = useOnboardingStatus();
  const [steps, setSteps] = useState<OnboardingStep[] | null>(null);
  const [index, setIndex] = useState(0);
  // Les étapes sont figées à l'arrivée : terminer le DISC ne fait pas disparaître l'étape en cours.
  if (!steps && status.ready) setSteps(stepsToShow(status.input));

  const finish = () => {
    toast.success(
      status.complete
        ? 'Profil complété, merci !'
        : 'Vous pourrez terminer votre profil plus tard.',
    );
    navigate('/', { replace: true });
  };
  const next = () => (steps && index < steps.length - 1 ? setIndex(index + 1) : finish());

  if (!steps) {
    return (
      <Page>
        <Skeleton className="mx-auto h-96 max-w-180" />
      </Page>
    );
  }
  const step = steps[index];

  return (
    <Page>
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <ol className="flex items-center gap-2" aria-label="Étapes">
          {steps.map((s, i) => {
            const Icon = META[s].icon;
            const done = i < index;
            return (
              <li key={s} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors',
                    i === index
                      ? 'bg-accent text-white shadow-sm'
                      : done
                        ? 'bg-success text-white'
                        : 'bg-surface-muted text-fg-subtle',
                  )}
                  aria-current={i === index ? 'step' : undefined}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                </span>
                <span
                  className={cn(
                    'hidden truncate text-sm sm:inline',
                    i === index ? 'font-medium' : 'text-fg-subtle',
                  )}
                >
                  {META[s].label}
                </span>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn('h-px flex-1', done ? 'bg-success' : 'bg-line')}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div key={step} className="animate-page-in">
          {step === 'bienvenue' && (
            <Welcome
              firstName={profile.first_name}
              isManager={isManager}
              steps={steps}
              onNext={next}
              onLater={finish}
            />
          )}
          {step === 'disc' && (
            <div className="flex flex-col gap-3">
              <StepTitle
                title="Mon style de communication"
                text="8 situations, environ 2 minutes. Choisissez la phrase qui vous ressemble le plus : il n’y a pas de bonne réponse."
              />
              <DiscQuiz onDone={next} />
            </div>
          )}
          {step === 'competences' && <SkillsStep onNext={next} />}
          {step === 'notifications' && <NotificationsStep isManager={isManager} onDone={finish} />}
        </div>
      </div>
    </Page>
  );
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-base text-fg-muted">{text}</p>
    </div>
  );
}

function Welcome({
  firstName,
  isManager,
  steps,
  onNext,
  onLater,
}: {
  firstName: string;
  isManager: boolean;
  steps: OnboardingStep[];
  onNext: () => void;
  onLater: () => void;
}) {
  const todo = steps.filter((s) => s === 'disc' || s === 'competences');
  return (
    <section className="flex flex-col gap-5 overflow-hidden rounded-xl bg-gradient-to-br from-hero-from to-hero-to p-6 text-white shadow-md sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Bienvenue {firstName} !</h1>
        <p className="text-base text-white/85">
          {todo.length
            ? `Encore ${todo.length === 1 ? 'une étape' : `${todo.length} étapes`} pour compléter votre profil. Comptez ${todo.length === 1 ? '2' : '4'} minutes.`
            : 'Votre profil est complet : un dernier réglage et c’est parti.'}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {todo.includes('disc') && (
          <li className="flex gap-3">
            <Compass className="mt-px size-5 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Votre style de communication (DISC)</span>
              <span className="block text-sm text-white/80">
                {isManager
                  ? 'Pour mieux connaître votre propre façon de communiquer.'
                  : 'Votre manager adapte la forme de ses échanges avec vous.'}
              </span>
            </span>
          </li>
        )}
        {todo.includes('competences') && (
          <li className="flex gap-3">
            <Grid3x3 className="mt-px size-5 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Vos compétences</span>
              <span className="block text-sm text-white/80">
                Votre niveau sur quelques compétences de l’équipe, que votre manager valide avec
                vous.
              </span>
            </span>
          </li>
        )}
        <li className="flex gap-3">
          <ShieldCheck className="mt-px size-5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">Vous gardez la main</span>
            <span className="block text-sm text-white/80">
              Tout se corrige à tout moment dans Mon profil. Rien n’est une évaluation.
            </span>
          </span>
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          className="border-transparent bg-white text-accent hover:bg-white/90"
          onClick={onNext}
        >
          Commencer
          <ArrowRight aria-hidden />
        </Button>
        <Button
          className="border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20"
          onClick={onLater}
        >
          Plus tard
        </Button>
      </div>
    </section>
  );
}

function SkillsStep({ onNext }: { onNext: () => void }) {
  const { profile } = useCurrentUser();
  const skills = useSkills();
  const levels = useSkillLevels();
  if (!skills.data || !levels.data) return <Skeleton className="h-96" />;
  const mine = levels.data.filter((l) => l.collaborator_id === profile.id);
  const done = mine.filter((l) => l.self_level).length;
  const min = minSelfAssessed(skills.data.length);
  return (
    <div className="flex flex-col gap-4">
      <StepTitle
        title="Mes compétences"
        text={`Indiquez votre niveau, de 1 (débutant) à 4 (expert). Au moins ${min} pour commencer, toutes si vous le pouvez.`}
      />
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface/95 px-4 py-3 shadow-sm backdrop-blur">
        <span className="text-sm">
          <span className="tabular font-semibold">{done}</span> / {skills.data.length} compétences
          évaluées
        </span>
        <Button variant="primary" disabled={done < min} onClick={onNext}>
          Continuer
          <ArrowRight aria-hidden />
        </Button>
      </div>
      <SelfAssessment skills={skills.data} levels={mine} />
    </div>
  );
}

function NotificationsStep({ isManager, onDone }: { isManager: boolean; onDone: () => void }) {
  const push = usePushState();
  const [busy, setBusy] = useState(false);
  const enable = async () => {
    setBusy(true);
    try {
      await push.enable();
      toast.success('Notifications activées');
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <StepTitle
        title="Restez informé"
        text="Facultatif : vous pourrez changer d’avis dans Mon profil."
      />
      <Panel>
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {(isManager
              ? ['Demandes de 1 à 1 et de congés, en direct', 'Le récap de l’équipe chaque lundi']
              : [
                  'Un rappel si vous oubliez votre pouls du jour',
                  'La réponse de votre manager à vos demandes de congé',
                  'Le rappel avant votre 1 à 1',
                ]
            ).map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-px size-4 shrink-0 text-success" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {push.state === 'on' ? (
              <span className="flex items-center gap-2 text-sm font-medium text-success">
                <Check className="size-4" aria-hidden />
                Notifications activées sur cet appareil
              </span>
            ) : push.state === 'off' ? (
              <Button variant="primary" disabled={busy} onClick={() => void enable()}>
                {busy ? (
                  <Loader2 className="motion-safe:animate-spin" aria-hidden />
                ) : (
                  <BellRing aria-hidden />
                )}
                Activer les notifications
              </Button>
            ) : (
              <span className="text-sm text-fg-muted">
                {push.state === 'denied'
                  ? 'Notifications bloquées : autorisez-les dans les réglages du navigateur.'
                  : 'Sur iPhone : ajoutez d’abord Connect Team à l’écran d’accueil (Partager › Sur l’écran d’accueil).'}
              </span>
            )}
          </div>
        </div>
      </Panel>
      <Button
        variant={push.state === 'on' ? 'primary' : 'secondary'}
        className="self-start"
        onClick={onDone}
      >
        Terminer
        <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}
