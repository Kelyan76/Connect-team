import { describe, expect, it } from 'vitest';
import { valueToTopics, topicsToValue, hasQuickPrep } from '@/features/reviews/lib/quick-prep';
import { bestStreak, pulseBadges } from './badges';

describe('séries et badges du pouls', () => {
  it('une série enjambe le week-end', () => {
    // jeudi, vendredi, lundi, mardi
    expect(bestStreak(['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'])).toBe(4);
  });

  it('un jour manqué coupe la série', () => {
    expect(bestStreak(['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'])).toBe(2);
  });

  it('badges obtenus et prochain badge', () => {
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
    const r = pulseBadges({ days, notes: 0, today: '2026-11-06' });
    expect(r.current).toBe(5);
    expect(r.badges.filter((b) => b.got).map((b) => b.id)).toEqual(['premier', 'serie3', 'semaine']);
    expect(r.next?.id).toBe('mot');
  });

});

describe('préparer mon 1 à 1', () => {
  it('les sujets choisis font l’aller-retour', () => {
    expect(valueToTopics(topicsToValue(['Ma charge', 'Une idée']))).toEqual(['Ma charge', 'Une idée']);
    expect(valueToTopics(null)).toEqual([]);
  });

  it('détecte une préparation rapide commencée', () => {
    expect(hasQuickPrep([{ question_key: 'ca_coince', author: 'collaborateur', value: 'Le délai' }])).toBe(true);
    expect(hasQuickPrep([{ question_key: 'q1', author: 'collaborateur', value: 'x' }])).toBe(false);
  });
});
