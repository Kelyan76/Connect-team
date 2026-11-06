/**
 * Droits côté interface (navigation, actions affichées). Ils reflètent les politiques RLS,
 * qui restent la seule garantie : une action masquée ici est aussi refusée par la base.
 */
export type Role = 'manager' | 'collaborateur';

export type Action =
  | 'equipe.voir'
  | 'equipe.inviter'
  | 'equipe.desactiver'
  | 'notes_privees.voir'
  | 'objectifs.creer'
  | 'objectifs.valider_avancement'
  | 'objectifs.proposer_avancement'
  | 'competences.valider'
  | 'competences.auto_evaluer'
  | 'entretiens.planifier'
  | 'entretiens.demander'
  | 'trames.modifier'
  | 'taches.creer'
  | 'taches.deplacer'
  | 'charge.modifier'
  | 'absences.demander'
  | 'absences.decider'
  | 'meteo.saisir'
  | 'feedbacks.rediger'
  | 'reunions.voir'
  | 'delegation.modifier'
  | 'alertes.voir'
  | 'rapports.voir'
  | 'parametres.modifier'
  | 'journal.voir';

const MANAGER_ONLY = new Set<Action>([
  'equipe.voir',
  'equipe.inviter',
  'equipe.desactiver',
  'notes_privees.voir',
  'objectifs.creer',
  'objectifs.valider_avancement',
  'competences.valider',
  'entretiens.planifier',
  'trames.modifier',
  'taches.creer',
  'charge.modifier',
  'absences.decider',
  'feedbacks.rediger',
  'reunions.voir',
  'delegation.modifier',
  'alertes.voir',
  'rapports.voir',
  'parametres.modifier',
  'journal.voir',
]);

const COLLABORATOR_ONLY = new Set<Action>([
  'objectifs.proposer_avancement',
  'competences.auto_evaluer',
  'entretiens.demander',
  'absences.demander',
  'meteo.saisir',
]);

export function can(role: Role, action: Action): boolean {
  if (MANAGER_ONLY.has(action)) return role === 'manager';
  if (COLLABORATOR_ONLY.has(action)) return role === 'collaborateur';
  return true;
}
