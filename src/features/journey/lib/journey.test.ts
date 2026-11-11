import { describe, expect, it } from 'vitest';
import { annualSummary, buildJourney, byMonth, journeyTotals, type JourneyInput } from './journey';

const input: JourneyInput = {
  feedbacks: [
    { id: 'f1', kind: 'reconnaissance', is_shared: true, body: 'Merci', desc_d: 'Ta revue a évité deux semaines de refonte.', created_at: '2026-10-01T10:00:00Z' },
    { id: 'f2', kind: 'reconnaissance', is_shared: false, body: 'Brouillon', desc_d: '', created_at: '2026-10-02T10:00:00Z' },
    { id: 'f3', kind: 'recadrage', is_shared: true, body: 'Recadrage', desc_d: '', created_at: '2026-10-03T10:00:00Z' },
  ],
  objectives: [
    { id: 'o1', title: 'Publier la 3.0', progress: 1, due_date: '2026-12-01', keyResults: [{ validated_at: '2026-11-05T10:00:00Z' }] },
    { id: 'o2', title: 'En cours', progress: 0.6, due_date: '2026-12-01', keyResults: [] },
  ],
  missions: [{ id: 'm1', title: 'Étude de la synchro', status: 'terminee', debrief: 'Adoptée par le comité', autonomy: 5, updated_at: '2026-09-20T10:00:00Z' }],
  skills: [
    { skill: 'React', level: 4, validated_at: '2026-10-01T09:00:00Z' },
    { skill: 'Node.js', level: 3, validated_at: '2026-10-01T09:00:00Z' },
    { skill: 'Kotlin', level: 1, validated_at: '2026-10-01T09:00:00Z' },
  ],
  actions: [
    { id: 'a1', title: 'Livrer la bêta', status: 'fait', done_at: '2026-11-02T10:00:00Z' },
    { id: 'a2', title: 'Pas fini', status: 'en_cours', done_at: null },
  ],
  reviews: [{ id: 'r1', kind: 'annuel', label: 'Entretien annuel', summary: 'Belle année', collaborator_signed_at: 'x', manager_signed_at: 'x', scheduled_at: '2025-12-01T10:00:00Z' }],
};

describe('mon parcours', () => {
  const events = buildJourney(input);

  it('ne retient que les réussites partagées et terminées', () => {
    expect(events.map((e) => e.id)).toEqual(['obj-o1', 'ac-a1', 'sk-2026-10-01', 'fb-f1', 'mi-m1', 'rv-r1']);
  });

  it('réunit les compétences validées le même jour, sans les niveaux débutants', () => {
    const skills = events.find((e) => e.kind === 'competence');
    expect(skills?.title).toBe('2 compétences validées');
    expect(skills?.detail).toBe('React (4/4) · Node.js (3/4)');
    expect(journeyTotals(events).competence).toBe(2);
  });

  it('regroupe par mois, du plus récent au plus ancien', () => {
    expect(byMonth(events).map((g) => g.month)).toEqual(['2026-11', '2026-10', '2026-09', '2025-12']);
  });

  it('prépare un résumé pour l’entretien annuel', () => {
    const text = annualSummary(events, '2026-01-01');
    expect(text).toContain('Objectifs atteints : 1');
    expect(text).toContain('- Étude de la synchro : Adoptée par le comité');
    expect(text).not.toContain('Belle année');
  });
});
