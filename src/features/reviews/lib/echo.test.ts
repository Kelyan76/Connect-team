import { describe, expect, it } from 'vitest';
import { guessOwner, parseDue, readEchoResult, summaryLines, toDrafts } from './echo';

// Lundi 16 novembre 2026
const today = new Date(2026, 10, 16);

describe('parseDue', () => {
  it('jours de la semaine : prochaine occurrence', () => {
    expect(parseDue('Vendredi', today)).toBe('2026-11-20');
    expect(parseDue('mardi prochain', today)).toBe('2026-11-17');
    expect(parseDue('lundi', today)).toBe('2026-11-23');
  });
  it('expressions relatives', () => {
    expect(parseDue('demain', today)).toBe('2026-11-17');
    expect(parseDue('après-demain', today)).toBe('2026-11-18');
    expect(parseDue("aujourd'hui", today)).toBe('2026-11-16');
    expect(parseDue('dans 3 jours', today)).toBe('2026-11-19');
    expect(parseDue('dans deux semaines', today)).toBe('2026-11-30');
    expect(parseDue('fin du mois', today)).toBe('2026-11-30');
    expect(parseDue('la semaine prochaine', today)).toBe('2026-11-27');
    expect(parseDue('fin de semaine', today)).toBe('2026-11-20');
  });
  it('dates explicites', () => {
    expect(parseDue('le 12 décembre', today)).toBe('2026-12-12');
    expect(parseDue('1er mars', today)).toBe('2027-03-01');
    expect(parseDue('04/12', today)).toBe('2026-12-04');
    expect(parseDue('2026-12-01', today)).toBe('2026-12-01');
  });
  it('inconnu ou vide : pas de date', () => {
    expect(parseDue('bientôt', today)).toBe('');
    expect(parseDue(null, today)).toBe('');
  });
});

describe('guessOwner', () => {
  it('reconnaît le collaborateur et le manager', () => {
    expect(guessOwner('Hugo', 'Kelyan', 'Hugo')).toBe('collaborateur');
    expect(guessOwner('Kélyan', 'Kelyan', 'Hugo')).toBe('manager');
    expect(guessOwner('moi', 'Kelyan', 'Hugo')).toBe('manager');
    expect(guessOwner('Intervenant 1', 'Kelyan', 'Hugo')).toBe('collaborateur');
    expect(guessOwner(undefined, 'Kelyan', 'Hugo')).toBe('collaborateur');
  });
});

describe('réponse Echo', () => {
  const raw = {
    summary: '- **Documentation** : finalisation vendredi.\n- **Support** : point avec Inès.',
    tasks: [
      { owner: 'Hugo', title: "Terminer la documentation de l'API", due: 'Vendredi' },
      { owner: 'Kelyan', title: 'Organiser un point avec Inès', due: 'Mardi prochain' },
      { title: 'ok' },
      'invalide',
    ],
  };
  it('valide la forme et ignore les entrées invalides', () => {
    expect(readEchoResult(null)).toBeNull();
    expect(readEchoResult(raw)?.tasks).toHaveLength(3);
  });
  it('produit des brouillons prêts à ajouter', () => {
    const drafts = toDrafts(
      readEchoResult(raw) ?? { summary: '', tasks: [] },
      { manager: 'Kelyan', collaborator: 'Hugo' },
      today,
    );
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ owner: 'collaborateur', due: '2026-11-20', keep: true });
    expect(drafts[1]).toMatchObject({ owner: 'manager', due: '2026-11-17' });
  });
  it('résumé en lignes simples', () => {
    expect(summaryLines(raw.summary)).toEqual([
      'Documentation : finalisation vendredi.',
      'Support : point avec Inès.',
    ]);
  });
});
