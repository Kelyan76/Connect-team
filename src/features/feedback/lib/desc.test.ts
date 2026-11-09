import { describe, expect, it } from 'vitest';
import { composeFeedback, emptyDesc, lintFeedback, missingSteps } from './desc';

const ids = (issues: { id: string }[]) => issues.map((i) => i.id);

describe('feedback DESC', () => {
  it('une reconnaissance se compose de D et E seulement', () => {
    const parts = { ...emptyDesc(), d: 'Ta relance a débloqué le dossier.', e: 'Merci, ça m’a ôté une épine du pied.', s: 'ignoré' };
    expect(composeFeedback('reconnaissance', parts)).toBe('Ta relance a débloqué le dossier. Merci, ça m’a ôté une épine du pied.');
    expect(missingSteps('reconnaissance', parts)).toEqual([]);
  });

  it('un recadrage exige les quatre temps', () => {
    expect(missingSteps('recadrage', { ...emptyDesc(), d: 'Lundi en réunion…', e: 'Je suis gêné.' })).toEqual(['s', 'c']);
  });

  it('repère les pièges du cours', () => {
    const issues = lintFeedback('recadrage', {
      d: 'Tu arrives toujours en retard, tu es vraiment pas sérieux.',
      e: 'Tu me fatigues.',
      s: 'Tu dois arriver à l’heure mais aussi prévenir.',
      c: 'Sinon, avertissement.',
    });
    expect(ids(issues)).toEqual(expect.arrayContaining(['gen-d', 'jug-d', 'doit-s', 'mais-s', 'c-menace', 's-question']));
  });

  it('accepte un message conforme', () => {
    const issues = lintFeedback('recadrage', {
      d: 'Mardi et jeudi, tu es arrivé 15 et 20 minutes après l’heure prévue chez deux prospects.',
      e: 'Je suis inquiet : nous cherchons à les convaincre de notre fiabilité.',
      s: 'Qu’est-ce qui t’a mis en retard ? Je te demande d’être sur place 10 minutes avant.',
      c: 'Si tu es à l’heure, je te confie seul le rendez-vous du 20.',
    });
    expect(issues).toEqual([]);
  });

  it('signale une expression sans « je »', () => {
    expect(ids(lintFeedback('reconnaissance', { ...emptyDesc(), d: 'Livraison faite jeudi.', e: 'Bravo à toi.' }))).toContain('e-je');
  });
});
