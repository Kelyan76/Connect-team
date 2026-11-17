import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { formatDate, fullName } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toaster';
import { absenceNotices, DECISION_WINDOW_DAYS, unseen, type AbsenceNotice } from './lib/notices';
import { useAbsences } from './queries';

export interface NoticeItem {
  id: string;
  severity: 'danger' | 'warning';
  title: string;
  detail: string;
  to: string;
}

const period = (n: AbsenceNotice) =>
  n.start === n.end
    ? `le ${formatDate(n.start)}`
    : `du ${formatDate(n.start)} au ${formatDate(n.end)}`;

/** Notifications de congés pour la cloche (manager : demandes ; collaborateur : décisions récentes). */
export function useAbsenceNotices(): {
  notices: AbsenceNotice[];
  items: NoticeItem[];
  all: NoticeItem[];
} {
  const { profile, isManager } = useCurrentUser();
  const absences = useAbsences();
  const team = useTeamMembers();

  return useMemo(() => {
    const notices = absenceNotices(
      absences.data ?? [],
      isManager ? 'manager' : 'collaborateur',
      profile.id,
      isoAddDays(todayIso(), -DECISION_WINDOW_DAYS),
    );
    const items = notices.map((n): NoticeItem => {
      if (n.kind === 'demande') {
        const who = team.byId.get(n.personId);
        return {
          id: n.id,
          severity: 'danger',
          title: `Demande de congé : ${who ? fullName(who) : 'un collaborateur'}`,
          detail: `${period(n)} · à valider`,
          to: '/calendrier',
        };
      }
      return {
        id: n.id,
        severity: n.kind === 'acceptee' ? 'warning' : 'danger',
        title: n.kind === 'acceptee' ? 'Congé accepté' : 'Congé refusé',
        detail: `${period(n)}${n.comment ? ` · « ${n.comment.slice(0, 80)} »` : ''}`,
        to: '/calendrier',
      };
    });
    // Dans la cloche : les décisions des 3 derniers jours seulement (la fenêtre à l'écran, elle, rattrape 14 jours).
    const recent = isoAddDays(todayIso(), -3);
    const bell = items.filter(
      (_, i) =>
        notices[i].kind === 'demande' ||
        (absences.data?.find((x) => x.id === notices[i].absenceId)?.decided_at ?? '').slice(
          0,
          10,
        ) >= recent,
    );
    return { notices, items: bell, all: items };
  }, [absences.data, isManager, profile.id, team.byId]);
}

const storageKey = (userId: string) => `connect-team:conges-vus:${userId}`;
function readSeen(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(userId: string, seen: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seen].slice(-200)));
  } catch {
    // stockage indisponible : la notification pourra réapparaître, sans gravité
  }
}

/**
 * Fenêtre de notification à l'écran pour chaque nouvelle demande (manager) ou décision (collaborateur),
 * une seule fois par appareil, même si elle est arrivée pendant que l'application était fermée.
 */
export function useAbsenceToasts(onNew: () => void) {
  const { profile } = useCurrentUser();
  const { notices, all: items } = useAbsenceNotices();
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seen.current === null) seen.current = readSeen(profile.id);
    const fresh = unseen(notices, seen.current);
    if (!fresh.length) return;
    for (const n of fresh) {
      seen.current.add(n.id);
      const item = items.find((i) => i.id === n.id);
      if (!item) continue;
      const show =
        n.kind === 'refusee' ? toast.error : n.kind === 'acceptee' ? toast.success : toast;
      show(item.title, {
        description: item.detail,
        action: { label: 'Voir', onClick: () => navigate('/calendrier') },
        duration: 10_000,
      });
    }
    saveSeen(profile.id, seen.current);
    onNew();
  }, [notices, items, profile.id, navigate, onNew]);
}
