import { describe, expect, it } from 'vitest';
import type { ReviewLike } from '@/features/reviews/lib/review-rules';
import { computeAlerts, type AlertInput } from './alerts';

const settings = {
  no_one_to_one_days: 30,
  overload_pct: 100,
  overload_weeks: 2,
  weather_drop_weeks: 3,
  review_due_days: 30,
  prep_reminder_days: 3,
};
const person = { id: 'p1', first_name: 'Julien', last_name: 'Mercier', hired_on: '2017-10-16' };
const review = (over: Partial<ReviewLike & { id: string; collaborator_id: string }>) => ({
  id: 'r',
  collaborator_id: 'p1',
  kind: 'one_to_one' as const,
  status: 'termine' as const,
  scheduled_at: '2026-10-25T09:00:00Z',
  collaborator_prepared_at: 'x',
  manager_prepared_at: 'x',
  collaborator_signed_at: 'x',
  manager_signed_at: 'x',
  ...over,
});
const base: AlertInput = {
  today: '2026-11-04',
  people: [person],
  objectives: [],
  reviews: [
    review({ id: 'oto' }),
    review({ id: 'an', kind: 'annuel', scheduled_at: '2026-02-01T09:00:00Z' }),
    review({ id: 'pro', kind: 'professionnel', scheduled_at: '2026-01-10T09:00:00Z' }),
  ],
  allocations: [],
  weeks: ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'],
  weather: [],
  settings,
};
const kinds = (input: AlertInput) => computeAlerts(input).map((a) => a.kind);

describe('alertes intelligentes', () => {
  it('aucune alerte quand tout est à jour', () => {
    expect(computeAlerts(base)).toEqual([]);
  });

  it('objectif à risque ou en retard', () => {
    const input = { ...base, objectives: [{ id: 'o', title: 'Réduire les retours', owner_id: 'p1', status: 'en_retard' as const, due_date: '2026-10-30' }] };
    const [alert] = computeAlerts(input);
    expect(alert.kind).toBe('objectif');
    expect(alert.severity).toBe('danger');
  });

  it('pas de one-to-one depuis plus de 30 jours', () => {
    expect(kinds({ ...base, reviews: [review({ id: 'x', scheduled_at: '2026-09-20T09:00:00Z' }), ...base.reviews.slice(1)] })).toContain('one_to_one');
  });

  it('surcharge sur deux semaines consécutives uniquement', () => {
    const alloc = (week_start: string, percent: number) => ({ collaborator_id: 'p1', week_start, percent });
    expect(kinds({ ...base, allocations: [alloc('2026-10-26', 110), alloc('2026-11-02', 50), alloc('2026-11-09', 120)] })).not.toContain('surcharge');
    expect(kinds({ ...base, allocations: [alloc('2026-11-02', 110), alloc('2026-11-09', 105)] })).toContain('surcharge');
  });

  it('baisse de la météo sur trois semaines', () => {
    const w = (week_start: string, mood: number) => ({ collaborator_id: 'p1', week_start, mood, workload: 3 });
    const weather = [w('2026-10-12', 4), w('2026-10-19', 3), w('2026-10-26', 2), w('2026-11-02', 2)];
    expect(kinds({ ...base, weather })).toContain('meteo');
    expect(kinds({ ...base, weather: [...weather.slice(0, 3), w('2026-11-02', 3)] })).not.toContain('meteo');
  });

  it('entretien annuel à moins de 30 jours de son échéance et non planifié', () => {
    const reviews = [base.reviews[0], review({ id: 'an', kind: 'annuel', scheduled_at: '2025-11-20T09:00:00Z' }), base.reviews[2]];
    expect(kinds({ ...base, reviews })).toContain('echeance');
    const planned = [...reviews, review({ id: 'next', kind: 'annuel', status: 'planifie', scheduled_at: '2026-11-18T09:00:00Z' })];
    expect(kinds({ ...base, reviews: planned })).not.toContain('echeance');
  });

  it('entretien sous 3 jours non préparé', () => {
    const upcoming = review({ id: 'up', status: 'planifie', scheduled_at: '2026-11-06T09:00:00Z', collaborator_prepared_at: null, manager_prepared_at: null });
    expect(kinds({ ...base, reviews: [...base.reviews, upcoming] })).toContain('preparation');
    const ready = { ...upcoming, collaborator_prepared_at: 'x', manager_prepared_at: 'x' };
    expect(kinds({ ...base, reviews: [...base.reviews, ready] })).not.toContain('preparation');
  });

  it('respecte les seuils paramétrés', () => {
    const reviews = [review({ id: 'x', scheduled_at: '2026-09-20T09:00:00Z' }), ...base.reviews.slice(1)];
    expect(kinds({ ...base, reviews, settings: { ...settings, no_one_to_one_days: 60 } })).not.toContain('one_to_one');
  });
});

describe('signaux faibles du cours', () => {
  const retreat = { personId: 'p1', kind: 'en_baisse' as const, severity: 'warning' as const, title: 'Humeur en baisse : Julien', detail: '4,5 → 2,0 / 5' };
  const late = [
    { assignee_id: 'p1', title: 'Livrer le module agenda', due_date: '2026-10-28' },
    { assignee_id: 'p1', title: 'Corriger l’export iCal', due_date: '2026-11-01' },
  ];

  it('retrait au pouls et deux échéances manquées : signal de décrochage, pas de doublon', () => {
    const k = kinds({ ...base, pulseSignals: [retreat], lateTasks: late });
    expect(k).toContain('decrochage');
    expect(k).not.toContain('pouls');
    expect(k).not.toContain('echeances');
  });

  it('échéances manquées sans signal de moral : simple alerte d’échéances', () => {
    expect(kinds({ ...base, pulseSignals: [], lateTasks: late })).toContain('echeances');
  });

  it('aucune reconnaissance depuis plus de 30 jours : levier à activer', () => {
    expect(kinds({ ...base, recognitions: [{ collaborator_id: 'p1', created_at: '2026-09-01T10:00:00Z' }] })).toContain('reconnaissance');
    expect(kinds({ ...base, recognitions: [{ collaborator_id: 'p1', created_at: '2026-10-30T10:00:00Z' }] })).not.toContain('reconnaissance');
  });
});

describe('regroupement des signaux', () => {
  it('range chaque signal dans un menu et réunit ceux d’une même personne', async () => {
    const { byPerson, groupOf } = await import('./alerts');
    const a = (id: string, kind: 'decrochage' | 'echeances' | 'reconnaissance', personId: string) => ({ id, kind, severity: 'warning' as const, personId, title: id, detail: '', to: '/' });
    const list = [a('1', 'decrochage', 'p1'), a('2', 'echeances', 'p2'), a('3', 'echeances', 'p1')];
    expect(list.map(groupOf)).toEqual(['personnes', 'personnes', 'personnes']);
    expect(groupOf(a('4', 'reconnaissance', 'p1'))).toBe('lien');
    expect(byPerson(list).map((r) => [r.personId, r.alerts.length])).toEqual([['p1', 2], ['p2', 1]]);
  });
});
