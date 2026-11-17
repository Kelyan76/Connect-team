import { describe, expect, it } from 'vitest';
import {
  decisionPrompt,
  descPrompt,
  extractJson,
  parseDecision,
  parseDesc,
  parseQuestions,
  parseSmart,
  prepPrompt,
  smartPrompt,
} from './ai';

describe('lecture des réponses', () => {
  it('extrait le JSON même entouré de texte ou d’un bloc de code', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Voici : {"a":"b"} voilà')).toEqual({ a: 'b' });
    expect(extractJson('pas de json')).toBeNull();
    expect(extractJson('{cassé')).toBeNull();
  });

  it('feedback DESC : ne garde que les étapes demandées', () => {
    const reply =
      '{"d":"Hier, le dossier n’a pas été rendu.","e":"Je suis inquiet.","s":"Préviens-moi 24 h avant.","c":"On avancera sereinement."}';
    expect(parseDesc(reply, ['d', 'e'])).toEqual({
      d: 'Hier, le dossier n’a pas été rendu.',
      e: 'Je suis inquiet.',
    });
    expect(parseDesc('{"x":"y"}', ['d'])).toBeNull();
  });

  it('objectif SMART : valide et borne les résultats clés', () => {
    const reply = JSON.stringify({
      title: 'Réduire de 30 % les incidents d’ici mars',
      description: 'Mesuré chaque semaine.',
      means: 'Une demi-journée par semaine.',
      keyResults: [
        { title: 'Incidents par mois', unit: 'nb', start_value: '20', target_value: 14 },
        { title: 'x' },
        'invalide',
      ],
    });
    const p = parseSmart(reply);
    expect(p?.keyResults).toEqual([
      { title: 'Incidents par mois', unit: 'nb', start_value: 20, target_value: 14 },
    ]);
    expect(parseSmart('{"title":"a"}')).toBeNull();
  });

  it('questions et décision', () => {
    expect(
      parseQuestions('{"questions":["Comment vis-tu ces dernières semaines ?","ok"]}'),
    ).toEqual(['Comment vis-tu ces dernières semaines ?']);
    expect(parseQuestions('{"questions":[]}')).toBeNull();
    expect(parseDecision('{"decision":"Je fais un 1 à 1 demain."}')).toBe(
      'Je fais un 1 à 1 demain.',
    );
    expect(parseDecision('{}')).toBeNull();
  });
});

describe('consignes envoyées', () => {
  it('ne contiennent que le prénom et le texte saisi', () => {
    const p = descPrompt({
      kindLabel: 'Amélioration',
      goal: 'faire progresser',
      steps: ['d', 'e', 's', 'c'],
      firstName: 'Hugo',
      disc: 'S',
      raw: 'tu as raté la deadline',
      parts: { d: '', e: '', s: '', c: '' },
    });
    expect(p).toContain('Hugo');
    expect(p).toContain('tu as raté la deadline');
    expect(p).toContain('"d":"..."');
    expect(smartPrompt({ title: 'Faire mieux', description: '' })).toContain('Objectif d’équipe');
    expect(prepPrompt({ firstName: 'Inès', signals: [] })).toContain('Aucun signal');
    expect(
      decisionPrompt({
        firstName: 'Hugo',
        situation: 'retards',
        diagnosis: 'Pouvoir',
        response: 'lever les obstacles',
        scarfRisks: ['Statut'],
      }),
    ).toContain('Statut');
  });
});
