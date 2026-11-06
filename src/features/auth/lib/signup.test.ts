import { describe, expect, it } from 'vitest';
import { PASSWORD_RULES } from './password';
import { demoEmail, demoPassword, demoTag } from './signup';

describe('comptes de démonstration', () => {
  it('construit une adresse sans accents ni espaces sur le domaine réservé', () => {
    expect(demoEmail('Élodie', 'Le Gall', 'ab2c')).toBe('elodie.le-gall.ab2c@cadence-demo.example');
  });

  it('génère un mot de passe conforme aux règles', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = demoPassword();
      expect(PASSWORD_RULES.every((r) => r.test(p))).toBe(true);
    }
  });

  it('génère un suffixe court', () => {
    expect(demoTag()).toMatch(/^[a-z2-9]{4}$/);
  });
});
