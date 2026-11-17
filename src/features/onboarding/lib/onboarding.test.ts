import { describe, expect, it } from 'vitest';
import { isProfileComplete, missingSteps, proposedKey, stepsToShow } from './onboarding';

describe('profil à compléter', () => {
  it('collaborateur : DISC puis compétences', () => {
    expect(
      missingSteps({ role: 'collaborateur', hasDisc: false, skills: 12, selfAssessed: 0 }),
    ).toEqual(['disc', 'competences']);
    expect(
      missingSteps({ role: 'collaborateur', hasDisc: true, skills: 12, selfAssessed: 2 }),
    ).toEqual(['competences']);
    expect(
      isProfileComplete({ role: 'collaborateur', hasDisc: true, skills: 12, selfAssessed: 3 }),
    ).toBe(true);
  });

  it('équipe avec peu ou pas de compétences', () => {
    expect(
      isProfileComplete({ role: 'collaborateur', hasDisc: true, skills: 2, selfAssessed: 2 }),
    ).toBe(true);
    expect(
      isProfileComplete({ role: 'collaborateur', hasDisc: true, skills: 0, selfAssessed: 0 }),
    ).toBe(true);
  });

  it('manager : son style DISC seulement', () => {
    expect(missingSteps({ role: 'manager', hasDisc: false, skills: 12, selfAssessed: 0 })).toEqual([
      'disc',
    ]);
    expect(isProfileComplete({ role: 'manager', hasDisc: true, skills: 12, selfAssessed: 0 })).toBe(
      true,
    );
  });

  it('étapes affichées et proposition une fois par connexion', () => {
    expect(
      stepsToShow({ role: 'collaborateur', hasDisc: false, skills: 5, selfAssessed: 0 }),
    ).toEqual(['bienvenue', 'disc', 'competences', 'notifications']);
    expect(proposedKey('u1', '2026-11-17T08:00:00Z')).not.toBe(
      proposedKey('u1', '2026-11-18T08:00:00Z'),
    );
  });
});
