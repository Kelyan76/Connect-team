import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  parisClock,
  pulseWatchlist,
  recapMessage,
  shouldRemindPulse,
  shouldSendRecap,
} from '../../supabase/functions/_shared/schedule';

/** Logique d'envoi des rappels (Edge Function send-reminders). */
describe('horloge de Paris', () => {
  it('convertit UTC en heure de Paris, été comme hiver', () => {
    expect(parisClock(new Date('2026-11-09T08:00:00Z'))).toEqual({ date: '2026-11-09', hour: 9, weekday: 1 });
    expect(parisClock(new Date('2026-07-06T07:00:00Z'))).toEqual({ date: '2026-07-06', hour: 9, weekday: 1 });
    expect(parisClock(new Date('2026-11-08T23:30:00Z')).date).toBe('2026-11-09');
  });
});

describe('rappel du pouls', () => {
  const monday9 = { date: '2026-11-09', hour: 9, weekday: 1 };
  it('part à l’heure choisie, une fois par jour, seulement sans pouls', () => {
    expect(shouldRemindPulse(DEFAULT_PREFS, monday9, false)).toBe(true);
    expect(shouldRemindPulse(DEFAULT_PREFS, monday9, true)).toBe(false);
    expect(shouldRemindPulse({ ...DEFAULT_PREFS, last_pulse_reminder: '2026-11-09' }, monday9, false)).toBe(false);
    expect(shouldRemindPulse({ ...DEFAULT_PREFS, pulse_hour: 10 }, monday9, false)).toBe(false);
    expect(shouldRemindPulse({ ...DEFAULT_PREFS, pulse_reminder: false }, monday9, false)).toBe(false);
  });
  it('rattrape un passage manqué dans la matinée, jamais le week-end', () => {
    expect(shouldRemindPulse(DEFAULT_PREFS, { ...monday9, hour: 11 }, false)).toBe(true);
    expect(shouldRemindPulse(DEFAULT_PREFS, { date: '2026-11-08', hour: 9, weekday: 7 }, false)).toBe(false);
  });
});

describe('récap du lundi', () => {
  it('le lundi uniquement, une fois', () => {
    expect(shouldSendRecap(DEFAULT_PREFS, { date: '2026-11-09', hour: 9, weekday: 1 })).toBe(true);
    expect(shouldSendRecap(DEFAULT_PREFS, { date: '2026-11-10', hour: 9, weekday: 2 })).toBe(false);
    expect(shouldSendRecap({ ...DEFAULT_PREFS, last_recap: '2026-11-09' }, { date: '2026-11-09', hour: 10, weekday: 1 })).toBe(false);
  });
  it('résume les points d’attention', () => {
    const names = new Map([['j', 'Julien'], ['n', 'Nadia']]);
    const watch = pulseWatchlist(
      [
        { collaborator_id: 'j', day: '2026-11-06', mood: 1, workload: 5 },
        { collaborator_id: 'j', day: '2026-11-05', mood: 2, workload: 5 },
        { collaborator_id: 'n', day: '2026-11-06', mood: 4, workload: 5 },
        { collaborator_id: 'n', day: '2026-11-05', mood: 4, workload: 4 },
      ],
      names,
    );
    expect(watch).toEqual({ lowMood: ['Julien'], overloaded: ['Julien', 'Nadia'] });
    expect(recapMessage({ requests: 2, lateTasks: 1, reviewsThisWeek: 0, ...watch }).body).toBe(
      'Moral bas : Julien · surcharge : Julien, Nadia · 2 demandes de one-to-one · 1 tâche en retard',
    );
    expect(recapMessage({ requests: 0, lateTasks: 0, reviewsThisWeek: 0, lowMood: [], overloaded: [] }).body).toBe('Rien d’urgent : bonne semaine !');
  });
});
