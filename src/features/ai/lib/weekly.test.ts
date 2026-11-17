import { describe, expect, it } from 'vitest';
import { parseWeekly, weeklyPrompt } from './weekly';

const full = {
  bien: { text: 'Inès avance bien sur le front.', person: 'Inès' },
  priorite: { text: 'Voir Hugo : humeur en baisse et 2 retards.', person: 'Hugo' },
  echeances: 'Deux tâches en retard sur la v3.0.',
  reconnaissance: { text: 'Féliciter Yanis pour la bêta.', person: 'Yanis' },
  conseil: { text: 'Commencer chaque 1 à 1 par « Comment vas-tu ? ».' },
};

describe('la semaine de l’équipe', () => {
  it('lit les 5 lignes, en texte simple ou avec la personne', () => {
    const d = parseWeekly(`Voici : ${JSON.stringify(full)}`);
    expect(d?.priorite).toEqual({
      text: 'Voir Hugo : humeur en baisse et 2 retards.',
      person: 'Hugo',
    });
    expect(d?.echeances).toEqual({ text: 'Deux tâches en retard sur la v3.0.' });
  });

  it('refuse une réponse incomplète', () => {
    const partial: Record<string, unknown> = { ...full };
    delete partial.conseil;
    expect(parseWeekly(JSON.stringify(partial))).toBeNull();
    expect(parseWeekly('pas de json')).toBeNull();
  });

  it('accepte le contenu déjà stocké en base', () => {
    expect(parseWeekly(full)?.bien.person).toBe('Inès');
  });

  it('consigne avec le prénom du manager et la semaine', () => {
    const p = weeklyPrompt('Camille', 'S47');
    expect(p).toContain('Camille');
    expect(p).toContain('S47');
  });
});
