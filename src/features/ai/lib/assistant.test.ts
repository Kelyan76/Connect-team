import { describe, expect, it } from 'vitest';
import { actionLink, assistantContext, parseAssistantReply, trimHistory } from './assistant';

const people = [
  { id: 'h1', first_name: 'Hugo' },
  { id: 'i1', first_name: 'Inès' },
];

describe('réponse de l’assistant', () => {
  it('sépare le texte et la ligne ACTIONS', () => {
    const r = parseAssistantReply(
      'Bravo à Hugo.\n\nACTIONS: [{"type":"feedback","person":"Hugo","kind":"reconnaissance"},{"type":"review","person":"Hugo"}]',
      'manager',
    );
    expect(r.text).toBe('Bravo à Hugo.');
    expect(r.actions).toEqual([
      { type: 'feedback', person: 'Hugo', kind: 'reconnaissance' },
      { type: 'review', person: 'Hugo', kind: undefined },
    ]);
  });

  it('accepte aussi un JSON {reply, actions} et filtre selon le rôle', () => {
    const r = parseAssistantReply(
      '{"reply":"Voici.","actions":[{"type":"leave"},{"type":"feedback","person":"Hugo"}]}',
      'collaborateur',
    );
    expect(r.text).toBe('Voici.');
    expect(r.actions).toEqual([{ type: 'leave', person: undefined, kind: undefined }]);
  });

  it('texte seul, ou ligne ACTIONS illisible', () => {
    expect(parseAssistantReply('Simple réponse.', 'manager')).toEqual({
      text: 'Simple réponse.',
      actions: [],
    });
    expect(parseAssistantReply('Texte\nACTIONS: [cassé]', 'manager').actions).toEqual([]);
  });
});

describe('actions vers l’application', () => {
  it('ouvre le bon formulaire prérempli', () => {
    expect(
      actionLink({ type: 'feedback', person: 'hugo', kind: 'reconnaissance' }, people),
    ).toEqual({
      label: 'Féliciter · Hugo',
      to: '/feedbacks?nouveau=1&type=reconnaissance&collaborateur=h1',
    });
    expect(actionLink({ type: 'review', person: 'Ines' }, people)?.to).toBe(
      '/entretiens?planifier=1&collaborateur=i1',
    );
    expect(actionLink({ type: 'leave' }, [])?.to).toBe('/calendrier?nouveau=1');
  });
  it('ignore une personne inconnue quand elle est nécessaire', () => {
    expect(actionLink({ type: 'feedback', person: 'Paul' }, people)).toBeNull();
    expect(actionLink({ type: 'objective' }, people)?.to).toBe('/objectifs?nouveau=1');
    expect(actionLink({ type: 'objective' }, people, 'collaborateur')).toEqual({
      label: 'Voir mes objectifs',
      to: '/objectifs',
    });
  });
});

describe('contexte et historique', () => {
  it('le collaborateur ne parle pas des autres', () => {
    expect(assistantContext('collaborateur', 'Hugo', '')).toContain('jamais des autres membres');
    expect(assistantContext('manager', 'Camille', 'Hugo : pouls en baisse')).toContain(
      'Hugo : pouls en baisse',
    );
  });
  it('ne garde que les derniers échanges', () => {
    const msgs = Array.from({ length: 14 }, (_, i) => ({
      role: 'user' as const,
      content: String(i),
    }));
    expect(trimHistory(msgs)).toHaveLength(10);
    expect(trimHistory(msgs)[0].content).toBe('4');
  });
});
