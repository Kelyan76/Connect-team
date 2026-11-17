import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { formatDate, formatTime, fullName } from '@/shared/lib/format';
import { toast } from '@/shared/ui/toaster';
import { reviewNotices, type ReviewNotice } from './lib/notices';
import { useReviewRequests, useReviews } from './queries';

export interface ReviewNoticeItem {
  id: string;
  severity: 'danger' | 'warning';
  title: string;
  detail: string;
  to: string;
}

const WINDOW_DAYS = 14;
/** Dans la cloche : 3 jours (sauf « à signer », qui reste tant que ce n'est pas fait). */
const BELL_DAYS = 3;

const when = (iso?: string) => (iso ? `le ${formatDate(iso)} à ${formatTime(iso)}` : '');

/** Notifications du parcours 1 à 1 pour la cloche et les fenêtres à l'écran. */
export function useReviewNotices(): {
  notices: ReviewNotice[];
  items: ReviewNoticeItem[];
  bell: ReviewNoticeItem[];
} {
  const { profile, isManager } = useCurrentUser();
  const reviews = useReviews();
  const requests = useReviewRequests();
  const team = useTeamMembers();

  return useMemo(() => {
    const notices = reviewNotices(
      reviews.data ?? [],
      requests.data ?? [],
      isManager ? 'manager' : 'collaborateur',
      profile.id,
      isoAddDays(todayIso(), -WINDOW_DAYS),
    );
    const name = (id: string) => {
      const p = team.byId.get(id);
      return p ? fullName(p) : 'Un collaborateur';
    };
    const to = (n: ReviewNotice) => (n.reviewId ? `/entretiens/${n.reviewId}` : '/entretiens');
    const items = notices.map((n): ReviewNoticeItem => {
      switch (n.kind) {
        case 'planifie':
          return {
            id: n.id,
            severity: 'warning',
            title: 'Nouveau 1 à 1 planifié',
            detail: `${when(n.scheduledAt)} · préparez-le en 2 minutes`,
            to: to(n),
          };
        case 'acceptee':
          return {
            id: n.id,
            severity: 'warning',
            title: 'Demande de 1 à 1 acceptée',
            detail: n.scheduledAt ? `Prévu ${when(n.scheduledAt)}` : 'Votre manager l’a planifié',
            to: to(n),
          };
        case 'refusee':
          return {
            id: n.id,
            severity: 'danger',
            title: 'Demande de 1 à 1 refusée',
            detail: 'Parlez-en avec votre manager ou refaites une demande plus tard.',
            to: '/entretiens',
          };
        case 'a_signer':
          return {
            id: n.id,
            severity: 'danger',
            title: 'Compte-rendu à signer',
            detail: 'Votre manager a signé : relisez et signez à votre tour.',
            to: to(n),
          };
        case 'preparee':
          return {
            id: n.id,
            severity: 'warning',
            title: `${name(n.personId)} a préparé son 1 à 1`,
            detail: n.scheduledAt
              ? `Prévu ${when(n.scheduledAt)} · voir ses sujets`
              : 'Voir ses sujets',
            to: to(n),
          };
        case 'signee':
          return {
            id: n.id,
            severity: 'warning',
            title: `${name(n.personId)} a signé le compte-rendu`,
            detail: 'Le 1 à 1 est clôturé.',
            to: to(n),
          };
      }
    });
    const recent = isoAddDays(todayIso(), -BELL_DAYS);
    const bell = items.filter(
      (_, i) => notices[i].kind === 'a_signer' || notices[i].at.slice(0, 10) >= recent,
    );
    return { notices, items, bell };
  }, [reviews.data, requests.data, isManager, profile.id, team.byId]);
}

const storageKey = (userId: string) => `connect-team:1a1-vus:${userId}`;
function readSeen(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(userId: string, seen: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...seen].slice(-300)));
  } catch {
    // stockage indisponible : la notification pourra réapparaître, sans gravité
  }
}

/** Fenêtre à l'écran pour chaque nouvel événement du parcours 1 à 1, une seule fois par appareil. */
export function useReviewToasts(onNew: () => void) {
  const { profile } = useCurrentUser();
  const { notices, items } = useReviewNotices();
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seen.current === null) seen.current = readSeen(profile.id);
    const fresh = notices.filter((n) => !seen.current?.has(n.id));
    if (!fresh.length) return;
    for (const n of fresh.slice(0, 3)) {
      const item = items.find((i) => i.id === n.id);
      if (!item) continue;
      const show =
        n.kind === 'refusee'
          ? toast.error
          : n.kind === 'acceptee' || n.kind === 'signee'
            ? toast.success
            : toast;
      show(item.title, {
        description: item.detail,
        action: { label: 'Voir', onClick: () => navigate(item.to) },
        duration: 10_000,
      });
    }
    for (const n of fresh) seen.current.add(n.id);
    saveSeen(profile.id, seen.current);
    onNew();
  }, [notices, items, profile.id, navigate, onNew]);
}
