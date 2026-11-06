import { describe, expect, it } from 'vitest';
import { newPasswordSchema, passwordSchema } from './password';

describe('règles de mot de passe', () => {
  it('accepte un mot de passe conforme', () => {
    expect(passwordSchema.safeParse('Cadence-Demo26!').success).toBe(true);
  });

  it.each([
    ['trop court', 'Ab1!xyz'],
    ['sans majuscule', 'cadence-demo26!'],
    ['sans chiffre', 'Cadence-Demo!!'],
    ['sans caractère spécial', 'CadenceDemo26'],
  ])('refuse un mot de passe %s', (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });

  it('exige une confirmation identique', () => {
    const result = newPasswordSchema.safeParse({ password: 'Cadence-Demo26!', confirm: 'Cadence-Demo27!' });
    expect(result.success).toBe(false);
  });
});
