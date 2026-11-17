/**
 * Notifications du parcours 1 à 1 (affichées à l'écran une fois par appareil, et dans la cloche) :
 * - collaborateur : 1 à 1 planifié, demande acceptée ou refusée, compte-rendu à signer ;
 * - manager : préparation validée par le collaborateur, compte-rendu signé par le collaborateur.
 * Les demandes en attente côté manager sont déjà gérées par la cloche (use-reminders).
 */
export interface ReviewLike {
  id: string;
  collaborator_id: string;
  status: 'planifie' | 'termine' | 'annule';
  scheduled_at: string;
  created_at: string;
  collaborator_prepared_at: string | null;
  manager_signed_at: string | null;
  collaborator_signed_at: string | null;
}

export interface RequestLike {
  id: string;
  collaborator_id: string;
  status: 'en_attente' | 'validee' | 'refusee';
  decided_at: string | null;
  review_id: string | null;
}

export type ReviewNoticeKind =
  'planifie' | 'acceptee' | 'refusee' | 'a_signer' | 'preparee' | 'signee' | 'bientot';

export interface ReviewNotice {
  id: string;
  kind: ReviewNoticeKind;
  personId: string;
  reviewId: string | null;
  /** Date de l'événement (pour l'ordre et la fenêtre d'affichage). */
  at: string;
  scheduledAt?: string;
}

const day = (iso: string | null | undefined) => (iso ?? '').slice(0, 10);

export function reviewNotices(
  reviews: ReviewLike[],
  requests: RequestLike[],
  role: 'manager' | 'collaborateur',
  userId: string,
  sinceIso: string,
): ReviewNotice[] {
  const out: ReviewNotice[] = [];
  if (role === 'collaborateur') {
    const fromRequest = new Set(requests.map((r) => r.review_id).filter(Boolean));
    for (const r of reviews) {
      if (r.collaborator_id !== userId) continue;
      // Planifié par le manager (hors demande acceptée, signalée à part).
      if (r.status === 'planifie' && day(r.created_at) >= sinceIso && !fromRequest.has(r.id)) {
        out.push({
          id: `rdv-${r.id}`,
          kind: 'planifie',
          personId: r.collaborator_id,
          reviewId: r.id,
          at: r.created_at,
          scheduledAt: r.scheduled_at,
        });
      }
      // Le manager a signé : au collaborateur de signer (tant que ce n'est pas fait).
      if (r.manager_signed_at && !r.collaborator_signed_at) {
        out.push({
          id: `signer-${r.id}`,
          kind: 'a_signer',
          personId: r.collaborator_id,
          reviewId: r.id,
          at: r.manager_signed_at,
        });
      }
    }
    for (const q of requests) {
      if (
        q.collaborator_id !== userId ||
        q.status === 'en_attente' ||
        !q.decided_at ||
        day(q.decided_at) < sinceIso
      )
        continue;
      const review = reviews.find((r) => r.id === q.review_id);
      out.push({
        id: `demande-${q.id}-${q.status}`,
        kind: q.status === 'validee' ? 'acceptee' : 'refusee',
        personId: q.collaborator_id,
        reviewId: q.review_id,
        at: q.decided_at,
        scheduledAt: review?.scheduled_at,
      });
    }
  } else {
    for (const r of reviews) {
      if (r.collaborator_id === userId) continue;
      if (
        r.status === 'planifie' &&
        r.collaborator_prepared_at &&
        day(r.collaborator_prepared_at) >= sinceIso
      ) {
        out.push({
          id: `prepare-${r.id}`,
          kind: 'preparee',
          personId: r.collaborator_id,
          reviewId: r.id,
          at: r.collaborator_prepared_at,
          scheduledAt: r.scheduled_at,
        });
      }
      if (r.collaborator_signed_at && day(r.collaborator_signed_at) >= sinceIso) {
        out.push({
          id: `signe-${r.id}`,
          kind: 'signee',
          personId: r.collaborator_id,
          reviewId: r.id,
          at: r.collaborator_signed_at,
        });
      }
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** 1 à 1 qui commencent bientôt (dans les 2 heures, ou commencés depuis moins de 10 minutes). */
export function upcomingSoon<
  T extends Pick<ReviewLike, 'id' | 'status' | 'scheduled_at' | 'collaborator_id'>,
>(reviews: T[], nowMs: number): (T & { minutes: number })[] {
  return reviews
    .filter((r) => r.status === 'planifie')
    .map((r) => ({
      ...r,
      minutes: Math.round((new Date(r.scheduled_at).getTime() - nowMs) / 60000),
    }))
    .filter((r) => r.minutes > -10 && r.minutes <= 120)
    .sort((a, b) => a.minutes - b.minutes);
}
