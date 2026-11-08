import { describe, expect, it } from 'vitest';
import { recapToNotes } from './recap';

describe('récap vocal', () => {
  it('met en forme les points, décisions, actions et points de vigilance', () => {
    const text = recapToNotes(
      {
        synthese: 'Bon échange.',
        points: ['Charge des astreintes'],
        decisions: ['Roulement avec Bastien en décembre'],
        actions: [
          { titre: 'Proposer un planning', responsable: 'manager', echeance: '2026-11-20' },
          { titre: 'Lister les interventions', responsable: 'collaborateur', echeance: null },
        ],
        vigilance: [],
      },
      (iso) => `le ${iso}`,
    );
    expect(text).toContain('Points abordés\n- Charge des astreintes');
    expect(text).toContain('Décisions\n- Roulement avec Bastien en décembre');
    expect(text).toContain('- Proposer un planning (manager, pour le le 2026-11-20)');
    expect(text).toContain('- Lister les interventions (collaborateur)');
    expect(text).not.toContain('À suivre');
  });
});
