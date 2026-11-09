import { describe, expect, it } from 'vitest';
import { dreamLevers, leversToActivate, type DreamInput } from './dream';

const today = '2026-11-20';
const engaged: DreamInput = {
  today,
  objectives: [{ agreed: true, archived: false }],
  lastOneToOne: { date: '2026-11-13T10:00:00Z', priority: 'Livrer la bêta' },
  feedbacks: [{ kind: 'reconnaissance', is_shared: true, created_at: '2026-11-10T09:00:00Z' }],
  recentMoods: [4, 4, 5, 4],
  activeMissions: [{ autonomy: 3 }],
  decideDomains: 1,
  lastSkillUpdate: null,
};

const status = (input: DreamInput) => Object.fromEntries(dreamLevers(input).map((l) => [l.lever, l.status]));

describe('leviers DREAM', () => {
  it('collaborateur suivi sur les cinq leviers', () => {
    expect(status(engaged)).toEqual({ D: 'ok', R: 'ok', E: 'ok', A: 'ok', M: 'ok' });
  });

  it('collaborateur en retrait sans reconnaissance récente : leviers à activer', () => {
    const s = status({ ...engaged, feedbacks: [{ kind: 'reconnaissance', is_shared: true, created_at: '2026-10-01T09:00:00Z' }], recentMoods: [2, 1, 2], activeMissions: [] });
    expect(s.R).toBe('a_activer');
    expect(s.E).toBe('a_activer');
    expect(s.A).toBe('a_activer');
  });

  it('un feedback privé ne compte pas comme une reconnaissance', () => {
    const states = dreamLevers({ ...engaged, feedbacks: [{ kind: 'reconnaissance', is_shared: false, created_at: '2026-11-18T09:00:00Z' }] });
    expect(leversToActivate(states).map((l) => l.lever)).toContain('R');
  });

  it('sans pouls, l’environnement est inconnu plutôt que jugé', () => {
    expect(status({ ...engaged, recentMoods: [] }).E).toBe('inconnu');
  });
});
