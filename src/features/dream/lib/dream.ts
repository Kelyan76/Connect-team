import { daysBetween } from '@/shared/lib/dates';

/**
 * D.R.E.A.M. : les cinq leviers d'engagement que le manager active pour chaque collaborateur.
 * Direction, Reconnaissance, Environnement social, Autonomie, Montée en compétences.
 * L'état de chaque levier est déduit des traces laissées dans l'application (pas d'une note) :
 * c'est un aide-mémoire pour le manager, jamais une évaluation du collaborateur.
 */

export type Lever = 'D' | 'R' | 'E' | 'A' | 'M';
export type LeverStatus = 'ok' | 'partiel' | 'a_activer' | 'inconnu';

export const LEVERS: Record<Lever, { name: string; meaning: string; actionLabel: string; to: (personId: string) => string }> = {
  D: {
    name: 'Direction',
    meaning: 'Donner un cap clair, du sens, aider à prioriser.',
    actionLabel: 'Fixer ou revoir un objectif SMART',
    to: () => '/objectifs?nouveau=1',
  },
  R: {
    name: 'Reconnaissance',
    meaning: 'Valoriser les réussites par un feedback régulier et sincère.',
    actionLabel: 'Donner une reconnaissance',
    to: (id) => `/feedbacks?nouveau=1&collaborateur=${id}&type=reconnaissance`,
  },
  E: {
    name: 'Environnement social',
    meaning: 'Un climat sécurisant, fondé sur l’écoute et l’empathie.',
    actionLabel: 'Prendre des nouvelles en 1 à 1',
    to: (id) => `/entretiens?planifier=1&collaborateur=${id}`,
  },
  A: {
    name: 'Autonomie',
    meaning: 'Responsabiliser, laisser des marges de manœuvre sans micro-management.',
    actionLabel: 'Confier une mission',
    to: () => '/delegation?nouveau=1',
  },
  M: {
    name: 'Montée en compétences',
    meaning: 'Accompagner chacun dans son développement.',
    actionLabel: 'Faire le point sur ses compétences',
    to: () => '/competences',
  },
};

export const LEVER_ORDER: Lever[] = ['D', 'R', 'E', 'A', 'M'];

export interface DreamInput {
  today: string;
  objectives: { agreed: boolean; archived: boolean }[];
  lastOneToOne: { date: string; priority: string } | null;
  feedbacks: { kind: string; is_shared: boolean; created_at: string }[];
  recentMoods: number[];
  activeMissions: { autonomy: number }[];
  decideDomains: number;
  lastSkillUpdate: string | null;
}

export interface LeverState {
  lever: Lever;
  status: LeverStatus;
  detail: string;
}

const ago = (today: string, iso: string) => daysBetween(iso.slice(0, 10), today);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function dreamLevers(i: DreamInput): LeverState[] {
  const active = i.objectives.filter((o) => !o.archived);
  const agreed = active.filter((o) => o.agreed).length;
  const oto = i.lastOneToOne ? ago(i.today, i.lastOneToOne.date) : null;
  const direction: LeverState =
    agreed > 0 && oto !== null && oto <= 21 && i.lastOneToOne?.priority
      ? { lever: 'D', status: 'ok', detail: `Objectif partagé et priorité fixée il y a ${plural(oto, 'jour')}` }
      : active.length > 0 || (oto !== null && oto <= 30)
        ? { lever: 'D', status: 'partiel', detail: agreed === 0 ? 'Objectif non validé avec lui' : 'Pas de priorité fixée récemment en 1 à 1' }
        : { lever: 'D', status: 'a_activer', detail: 'Aucun objectif ni cap partagé' };

  const recognitions = i.feedbacks
    .filter((f) => f.kind === 'reconnaissance' || f.kind === 'point_fort')
    .filter((f) => f.is_shared)
    .map((f) => ago(i.today, f.created_at))
    .sort((a, b) => a - b);
  const lastReco = recognitions[0];
  const recognition: LeverState =
    lastReco === undefined
      ? { lever: 'R', status: 'a_activer', detail: 'Aucune reconnaissance partagée' }
      : lastReco <= 21
        ? { lever: 'R', status: 'ok', detail: `Dernière reconnaissance il y a ${plural(lastReco, 'jour')}` }
        : { lever: 'R', status: lastReco <= 45 ? 'partiel' : 'a_activer', detail: `Aucune reconnaissance depuis ${plural(lastReco, 'jour')}` };

  const mood = i.recentMoods.length ? i.recentMoods.reduce((s, m) => s + m, 0) / i.recentMoods.length : null;
  const environment: LeverState =
    mood === null
      ? { lever: 'E', status: 'inconnu', detail: 'Pas de pouls récent' }
      : mood >= 3.5
        ? { lever: 'E', status: 'ok', detail: `Humeur ${mood.toFixed(1).replace('.', ',')} / 5 sur 10 jours` }
        : { lever: 'E', status: mood >= 2.5 ? 'partiel' : 'a_activer', detail: `Humeur ${mood.toFixed(1).replace('.', ',')} / 5 sur 10 jours : prendre des nouvelles` };

  const autonomy: LeverState =
    i.activeMissions.length > 0
      ? { lever: 'A', status: 'ok', detail: `${plural(i.activeMissions.length, 'mission')} confiée${i.activeMissions.length > 1 ? 's' : ''} en cours` }
      : i.decideDomains >= 2
        ? { lever: 'A', status: 'partiel', detail: `Décide seul sur ${i.decideDomains} domaines, aucune mission en cours` }
        : { lever: 'A', status: 'a_activer', detail: 'Aucune mission confiée' };

  const skillDays = i.lastSkillUpdate ? ago(i.today, i.lastSkillUpdate) : null;
  const coaching = i.activeMissions.some((m) => m.autonomy <= 3);
  const growth: LeverState =
    (skillDays !== null && skillDays <= 60) || coaching
      ? { lever: 'M', status: 'ok', detail: coaching ? 'Mission en cours qui le fait progresser' : `Compétences revues il y a ${plural(skillDays ?? 0, 'jour')}` }
      : skillDays !== null && skillDays <= 120
        ? { lever: 'M', status: 'partiel', detail: `Compétences revues il y a ${plural(skillDays, 'jour')}` }
        : { lever: 'M', status: 'a_activer', detail: 'Pas de point récent sur son développement' };

  return [direction, recognition, environment, autonomy, growth];
}

export const leversToActivate = (states: LeverState[]) => states.filter((s) => s.status === 'a_activer');

/** Libellé et couleur de pastille de chaque état. */
export const LEVER_STATUS: Record<LeverStatus, { label: string; chip: string }> = {
  ok: { label: 'Activé', chip: 'bg-success text-white' },
  partiel: { label: 'À entretenir', chip: 'bg-warning-subtle text-warning' },
  a_activer: { label: 'À activer', chip: 'bg-danger-subtle text-danger' },
  inconnu: { label: 'Inconnu', chip: 'bg-surface-muted text-fg-subtle' },
};
