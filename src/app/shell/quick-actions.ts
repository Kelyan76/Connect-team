import {
  CalendarPlus,
  CalendarRange,
  HeartPulse,
  KanbanSquare,
  MessageSquarePlus,
  MessagesSquare,
  NotebookPen,
  PlayCircle,
  Send,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { nextPlannedReview } from '@/features/reviews/lib/review-rules';
import { useReviews } from '@/features/reviews/queries';
import { useTeamMembers } from '@/features/team/queries';
import { todayIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import type { SectionTone } from './section-colors';

/** Action rapide : un lien vers la page qui ouvre directement le bon formulaire, ou une fenêtre globale. */
export interface QuickAction {
  id: string;
  label: string;
  /** Libellé court des tuiles sur téléphone. */
  short: string;
  hint: string;
  icon: LucideIcon;
  tone: SectionTone;
  to?: string;
  dialog?: 'observation';
  /** Déjà présent sur l'accueil (ex. pouls du jour) : affiché seulement dans le bouton « + ». */
  notOnHome?: boolean;
}

/** Actions les plus fréquentes, selon le rôle : mêmes entrées sur l'accueil et dans le bouton « + » mobile. */
export function useQuickActions(): QuickAction[] {
  const { isManager, profile } = useCurrentUser();
  const reviews = useReviews();
  const team = useTeamMembers();
  const next = nextPlannedReview(reviews.data ?? [], todayIso());

  if (isManager) {
    const person = next ? team.byId.get(next.collaborator_id) : undefined;
    return [
      ...(next
        ? [
            {
              id: 'next',
              short: 'Prochain 1 à 1',
              label: 'Démarrer le prochain 1 à 1',
              hint: `${person?.first_name ?? 'Collaborateur'} · ${formatDate(next.scheduled_at)}`,
              icon: PlayCircle,
              tone: 'reviews' as const,
              to: `/entretiens/${next.id}`,
            },
          ]
        : []),
      {
        id: 'plan',
        short: 'Planifier',
        label: 'Planifier un 1 à 1',
        hint: 'Kit Keylia, 3 × 10 min',
        icon: CalendarPlus,
        tone: 'reviews',
        to: '/entretiens?planifier=1',
      },
      {
        id: 'feedback',
        short: 'Feedback',
        label: 'Donner un feedback',
        hint: 'Méthode DESC',
        icon: MessageSquarePlus,
        tone: 'reviews',
        to: '/feedbacks?nouveau=1',
      },
      {
        id: 'observation',
        short: 'Observation',
        label: 'Noter une observation',
        hint: 'Un fait, en 20 secondes',
        icon: NotebookPen,
        tone: 'team',
        dialog: 'observation',
      },
      {
        id: 'objective',
        short: 'Objectif',
        label: 'Nouvel objectif',
        hint: 'Objectif SMART',
        icon: Target,
        tone: 'goals',
        to: '/objectifs?nouveau=1',
      },
      {
        id: 'delegate',
        short: 'Déléguer',
        label: 'Déléguer une mission',
        hint: 'Niveau d’autonomie',
        icon: Send,
        tone: 'goals',
        to: '/delegation?nouveau=1',
      },
    ];
  }

  const mine = next && next.collaborator_id === profile.id ? next : undefined;
  return [
    mine
      ? {
          id: 'prep',
          short: 'Préparer',
          label: 'Préparer mon 1 à 1',
          hint: `${formatDate(mine.scheduled_at)} · 2 minutes`,
          icon: PlayCircle,
          tone: 'reviews',
          to: `/entretiens/${mine.id}`,
        }
      : {
          id: 'request',
          short: 'Demander',
          label: 'Demander un 1 à 1',
          hint: 'À votre manager',
          icon: MessagesSquare,
          tone: 'reviews',
          to: '/entretiens?demande=1',
        },
    {
      id: 'pulse',
      short: 'Pouls',
      label: 'Mon pouls du jour',
      hint: '10 secondes',
      icon: HeartPulse,
      tone: 'team',
      to: '/pouls',
      notOnHome: true,
    },
    {
      id: 'tasks',
      short: 'Tâches',
      label: 'Mes tâches',
      hint: 'Ma semaine',
      icon: KanbanSquare,
      tone: 'goals',
      to: '/taches',
      notOnHome: true,
    },
    {
      id: 'leave',
      short: 'Congés',
      label: 'Poser un congé',
      hint: 'Sur le calendrier',
      icon: CalendarRange,
      tone: 'goals',
      to: '/calendrier?nouveau=1',
    },
    {
      id: 'objectives',
      short: 'Objectifs',
      label: 'Mes objectifs',
      hint: 'Mettre à jour',
      icon: Target,
      tone: 'goals',
      to: '/objectifs',
    },
    {
      id: 'journey',
      short: 'Parcours',
      label: 'Mon parcours',
      hint: 'Mes réussites',
      icon: Trophy,
      tone: 'team',
      to: '/parcours',
    },
  ];
}
