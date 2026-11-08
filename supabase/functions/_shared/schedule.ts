// Logique d'envoi des rappels, sans dépendance à Deno : partagée par les Edge Functions et testée par Vitest.

export interface ParisClock {
  /** Date du jour à Paris, AAAA-MM-JJ. */
  date: string;
  /** Heure à Paris (0–23). */
  hour: number;
  /** 1 = lundi … 7 = dimanche. */
  weekday: number;
}

export function parisClock(now: Date): ParisClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: weekdays[parts.weekday] ?? 7 };
}

export interface Prefs {
  pulse_reminder: boolean;
  pulse_hour: number;
  weekly_recap: boolean;
  last_pulse_reminder: string | null;
  last_recap: string | null;
}

export const DEFAULT_PREFS: Prefs = { pulse_reminder: true, pulse_hour: 9, weekly_recap: true, last_pulse_reminder: null, last_recap: null };

/** Plage des envois : jours ouvrés, de 7 h à 12 h (heure de Paris). */
export const inSendingWindow = (c: ParisClock) => c.weekday <= 5 && c.hour >= 7 && c.hour <= 12;

/**
 * Rappel du pouls : jour ouvré, heure choisie atteinte (rattrapage si un passage a été manqué),
 * pas encore de pouls aujourd'hui, pas déjà rappelé aujourd'hui.
 */
export function shouldRemindPulse(p: Prefs, c: ParisClock, hasPulseToday: boolean): boolean {
  return inSendingWindow(c) && p.pulse_reminder && c.hour >= p.pulse_hour && !hasPulseToday && p.last_pulse_reminder !== c.date;
}

/** Récap du lundi pour le manager, à son heure, une seule fois. */
export function shouldSendRecap(p: Prefs, c: ParisClock): boolean {
  return inSendingWindow(c) && c.weekday === 1 && p.weekly_recap && c.hour >= p.pulse_hour && p.last_recap !== c.date;
}

export interface RecapStats {
  requests: number;
  lateTasks: number;
  reviewsThisWeek: number;
  lowMood: string[];
  overloaded: string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Texte court du récap (une notification : 2 à 3 lignes au plus). */
export function recapMessage(s: RecapStats): { title: string; body: string } {
  const parts: string[] = [];
  if (s.lowMood.length) parts.push(`moral bas : ${s.lowMood.join(', ')}`);
  if (s.overloaded.length) parts.push(`surcharge : ${s.overloaded.join(', ')}`);
  if (s.requests) parts.push(plural(s.requests, 'demande de one-to-one', 'demandes de one-to-one'));
  if (s.reviewsThisWeek) parts.push(plural(s.reviewsThisWeek, 'entretien cette semaine', 'entretiens cette semaine'));
  if (s.lateTasks) parts.push(plural(s.lateTasks, 'tâche en retard', 'tâches en retard'));
  const body = parts.length ? parts.join(' · ') : 'Rien d’urgent : bonne semaine !';
  return { title: 'Votre équipe cette semaine', body: body.charAt(0).toUpperCase() + body.slice(1) };
}

interface PulseRow {
  collaborator_id: string;
  day: string;
  mood: number;
  workload: number | null;
}

/** Personnes à surveiller d'après leurs 3 derniers pouls (mêmes seuils que l'application). */
export function pulseWatchlist(pulses: PulseRow[], names: Map<string, string>): { lowMood: string[]; overloaded: string[] } {
  const lowMood: string[] = [];
  const overloaded: string[] = [];
  for (const [id, name] of names) {
    const last3 = pulses
      .filter((p) => p.collaborator_id === id)
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 3);
    if (last3.length < 2) continue;
    const mood = last3.reduce((s, p) => s + p.mood, 0) / last3.length;
    const loads = last3.map((p) => p.workload).filter((w): w is number => w !== null);
    if (mood <= 2) lowMood.push(name);
    if (loads.length >= 2 && loads.reduce((s, w) => s + w, 0) / loads.length >= 4.3) overloaded.push(name);
  }
  return { lowMood, overloaded };
}
