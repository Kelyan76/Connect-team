/**
 * Notifications liées aux congés :
 * - manager : chaque demande en attente ;
 * - collaborateur : chaque décision (acceptée ou refusée) des 14 derniers jours.
 */
export interface AbsenceLike {
  id: string;
  collaborator_id: string;
  start_date: string;
  end_date: string;
  status: 'en_attente' | 'validee' | 'refusee';
  decision_comment: string;
  decided_at: string | null;
}

export interface AbsenceNotice {
  id: string;
  absenceId: string;
  kind: 'demande' | 'acceptee' | 'refusee';
  personId: string;
  start: string;
  end: string;
  comment: string;
}

export const DECISION_WINDOW_DAYS = 14;

export function absenceNotices(
  absences: AbsenceLike[],
  role: 'manager' | 'collaborateur',
  userId: string,
  sinceIso: string,
): AbsenceNotice[] {
  if (role === 'manager') {
    return absences
      .filter((a) => a.status === 'en_attente' && a.collaborator_id !== userId)
      .map((a) => ({
        id: `conge-${a.id}`,
        absenceId: a.id,
        kind: 'demande',
        personId: a.collaborator_id,
        start: a.start_date,
        end: a.end_date,
        comment: '',
      }));
  }
  return absences
    .filter(
      (a) =>
        a.collaborator_id === userId &&
        a.status !== 'en_attente' &&
        a.decided_at !== null &&
        a.decided_at.slice(0, 10) >= sinceIso,
    )
    .sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? ''))
    .map((a) => ({
      id: `conge-${a.id}-${a.status}`,
      absenceId: a.id,
      kind: a.status === 'validee' ? 'acceptee' : 'refusee',
      personId: a.collaborator_id,
      start: a.start_date,
      end: a.end_date,
      comment: a.decision_comment,
    }));
}

/** Notices pas encore montrées en fenêtre (identifiants mémorisés sur l'appareil). */
export const unseen = (notices: AbsenceNotice[], seen: Set<string>) =>
  notices.filter((n) => !seen.has(n.id));
