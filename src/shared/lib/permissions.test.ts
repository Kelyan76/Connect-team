import { describe, expect, it } from 'vitest';
import { can } from './permissions';

describe('droits par rôle', () => {
  it('réserve les notes privées, l’équipe et les paramètres au manager', () => {
    for (const action of ['notes_privees.voir', 'equipe.voir', 'parametres.modifier', 'journal.voir', 'alertes.voir'] as const) {
      expect(can('manager', action)).toBe(true);
      expect(can('collaborateur', action)).toBe(false);
    }
  });
  it('réserve la météo, l’auto-évaluation et les demandes au collaborateur', () => {
    for (const action of ['meteo.saisir', 'competences.auto_evaluer', 'entretiens.demander', 'absences.demander'] as const) {
      expect(can('collaborateur', action)).toBe(true);
      expect(can('manager', action)).toBe(false);
    }
  });
  it('autorise les deux rôles à faire avancer les tâches', () => {
    expect(can('manager', 'taches.deplacer')).toBe(true);
    expect(can('collaborateur', 'taches.deplacer')).toBe(true);
  });
});
