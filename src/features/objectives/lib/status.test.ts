import { describe, expect, it } from 'vitest';
import { keyResultProgress, objectiveProgress, objectiveStatus } from './status';

const obj = { start_date: '2026-07-01', due_date: '2026-12-31' };

describe('avancement des résultats clés', () => {
  it('calcule un avancement croissant', () => {
    expect(keyResultProgress({ start_value: 0, target_value: 40, current_value: 10 })).toBeCloseTo(0.25);
  });
  it('gère une cible inférieure au départ (réduction)', () => {
    expect(keyResultProgress({ start_value: 18, target_value: 12, current_value: 15 })).toBeCloseTo(0.5);
  });
  it('borne entre 0 et 1', () => {
    expect(keyResultProgress({ start_value: 0, target_value: 10, current_value: 14 })).toBe(1);
    expect(keyResultProgress({ start_value: 10, target_value: 20, current_value: 5 })).toBe(0);
  });
  it('fait la moyenne des résultats clés', () => {
    expect(
      objectiveProgress([
        { start_value: 0, target_value: 10, current_value: 5 },
        { start_value: 0, target_value: 10, current_value: 10 },
      ]),
    ).toBeCloseTo(0.75);
    expect(objectiveProgress([])).toBe(0);
  });
});

describe('statut automatique des objectifs', () => {
  // Au 1er octobre, environ 50 % du temps est écoulé.
  const today = '2026-10-01';
  it('en avance quand l’avancement dépasse le temps écoulé de 10 points', () => {
    expect(objectiveStatus(obj, 0.65, today)).toBe('en_avance');
  });
  it('dans les temps à ±10 points', () => {
    expect(objectiveStatus(obj, 0.45, today)).toBe('dans_les_temps');
  });
  it('à risque entre 10 et 25 points de retard', () => {
    expect(objectiveStatus(obj, 0.32, today)).toBe('a_risque');
  });
  it('en retard au-delà de 25 points', () => {
    expect(objectiveStatus(obj, 0.1, today)).toBe('en_retard');
  });
  it('en retard une fois l’échéance passée sans atteinte', () => {
    expect(objectiveStatus(obj, 0.95, '2027-01-05')).toBe('en_retard');
  });
  it('atteint = en avance, même après l’échéance', () => {
    expect(objectiveStatus(obj, 1, '2027-01-05')).toBe('en_avance');
  });
});
