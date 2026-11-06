import { addMonths } from 'date-fns';
import type { BadgeTone } from '@/shared/ui/badge';
import { toIsoDate } from '@/shared/lib/dates';
import { toDate } from '@/shared/lib/format';

export type ReviewKind = 'one_to_one' | 'annuel' | 'professionnel';
export type PrepStatus = 'a_preparer' | 'prepare_collaborateur' | 'prepare_manager' | 'pret';

export const KIND_LABEL: Record<ReviewKind, string> = {
  one_to_one: 'One-to-one',
  annuel: 'Entretien annuel',
  professionnel: 'Entretien professionnel',
};

export const PREP_META: Record<PrepStatus, { label: string; tone: BadgeTone }> = {
  a_preparer: { label: 'À préparer', tone: 'neutral' },
  prepare_collaborateur: { label: 'Préparé par le collaborateur', tone: 'warning' },
  prepare_manager: { label: 'Préparé par le manager', tone: 'warning' },
  pret: { label: 'Prêt', tone: 'success' },
};

export interface ReviewLike {
  kind: ReviewKind;
  status: 'planifie' | 'termine' | 'annule';
  scheduled_at: string;
  collaborator_prepared_at: string | null;
  manager_prepared_at: string | null;
  collaborator_signed_at: string | null;
  manager_signed_at: string | null;
}

export function prepStatus(r: Pick<ReviewLike, 'collaborator_prepared_at' | 'manager_prepared_at'>): PrepStatus {
  if (r.collaborator_prepared_at && r.manager_prepared_at) return 'pret';
  if (r.collaborator_prepared_at) return 'prepare_collaborateur';
  if (r.manager_prepared_at) return 'prepare_manager';
  return 'a_preparer';
}

export type Stage = 'preparation' | 'a_signer' | 'signe' | 'annule';

export function reviewStage(r: ReviewLike): Stage {
  if (r.status === 'annule') return 'annule';
  if (r.status === 'planifie') return 'preparation';
  return r.collaborator_signed_at && r.manager_signed_at ? 'signe' : 'a_signer';
}

/** Périodicité réglementaire : annuel tous les 12 mois, professionnel tous les 24 mois (art. L6315-1). */
export const REGULATORY_MONTHS: Partial<Record<ReviewKind, number>> = { annuel: 12, professionnel: 24 };

/** Prochaine échéance réglementaire d'un type d'entretien, à partir du dernier tenu (ou de l'embauche). */
export function nextRegulatoryDue(kind: ReviewKind, lastHeld: string | null, hiredOn: string | null): string | null {
  const months = REGULATORY_MONTHS[kind];
  const base = lastHeld ?? hiredOn;
  if (!months || !base) return null;
  return toIsoDate(addMonths(toDate(base.slice(0, 10)), months));
}

/**
 * Règles de visibilité côté interface (miroir des politiques RLS, appliquées en base) :
 * le manager ne voit la préparation du collaborateur qu'une fois celle-ci validée ;
 * le collaborateur voit celle du manager quand les deux sont validées.
 */
export function canSeeOtherSide(viewer: 'manager' | 'collaborateur', r: Pick<ReviewLike, 'collaborator_prepared_at' | 'manager_prepared_at'>): boolean {
  if (viewer === 'manager') return r.collaborator_prepared_at !== null;
  return r.collaborator_prepared_at !== null && r.manager_prepared_at !== null;
}

export function canEditOwnAnswers(viewer: 'manager' | 'collaborateur', r: ReviewLike): boolean {
  if (r.status === 'annule') return false;
  if (viewer === 'collaborateur') return r.status === 'planifie' && r.collaborator_prepared_at === null;
  return r.manager_signed_at === null;
}

export type AnswerValue = string | number | boolean | null;

/** Écart d'appréciation : échelles distantes d'au moins 2 points, ou choix/oui-non différents. */
export function hasGap(type: string, a: AnswerValue | undefined, b: AnswerValue | undefined): boolean {
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (type === 'echelle') return Math.abs(Number(a) - Number(b)) >= 2;
  if (type === 'choix' || type === 'oui_non') return a !== b;
  return false;
}
