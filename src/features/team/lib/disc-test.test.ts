import { describe, expect, it } from 'vitest';
import { DISC_QUESTIONS, scoreDisc } from './disc-test';

describe('test DISC rapide', () => {
  it('chaque question propose les quatre styles une seule fois', () => {
    for (const q of DISC_QUESTIONS) expect(q.answers.map((a) => a.style).sort()).toEqual(['C', 'D', 'I', 'S']);
    expect(DISC_QUESTIONS).toHaveLength(8);
  });

  it('style dominant et secondaire', () => {
    expect(scoreDisc(['S', 'S', 'C', 'S', 'C', 'I', 'S', 'D'])).toMatchObject({ primary: 'S', secondary: 'C' });
  });

  it('pas de secondaire s’il n’a été choisi qu’une fois', () => {
    expect(scoreDisc(['D', 'D', 'D', 'D', 'D', 'I', 'S', 'C']).secondary).toBeNull();
  });

  it('à égalité, le choix le plus récent l’emporte', () => {
    expect(scoreDisc(['D', 'I', 'D', 'I', 'S', 'C', 'S', 'C'])).toMatchObject({ primary: 'C', secondary: 'S' });
  });
});
