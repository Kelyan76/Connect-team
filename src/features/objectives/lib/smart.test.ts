import { describe, expect, it } from 'vitest';
import { smartCheck, smartScore } from './smart';

const base = { title: 'Publier l’application mobile 3.0', description: 'Sur les deux stores, avec 99,5 % de sessions sans plantage.', keyResults: 1, means: 'Appareils de test fournis', agreed: true, startDate: '2026-11-01', dueDate: '2026-12-15' };

describe('objectif SMART', () => {
  it('un objectif complet coche les cinq critères', () => {
    expect(smartScore(smartCheck(base))).toBe(5);
  });

  it('un objectif vague, sans mesure ni moyens, est signalé', () => {
    const c = smartCheck({ ...base, title: 'Améliorer la qualité', description: '', keyResults: 0, means: '', agreed: false });
    expect(c.filter((x) => !x.ok).map((x) => x.letter)).toEqual(['S', 'M', 'A', 'R']);
  });

  it('une échéance antérieure au début n’est pas temporelle', () => {
    expect(smartCheck({ ...base, dueDate: '2026-10-01' }).find((x) => x.letter === 'T')?.ok).toBe(false);
  });
});
