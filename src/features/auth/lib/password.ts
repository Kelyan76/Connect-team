import { z } from 'zod';

/** Règles de mot de passe : 10 caractères minimum, avec majuscule, chiffre et caractère spécial. */
export const PASSWORD_RULES = [
  { id: 'length', label: '10 caractères minimum', test: (v: string) => v.length >= 10 },
  { id: 'upper', label: 'Une majuscule', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'Une minuscule', test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', label: 'Un chiffre', test: (v: string) => /\d/.test(v) },
  { id: 'special', label: 'Un caractère spécial', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const passwordSchema = z
  .string()
  .refine((v) => PASSWORD_RULES.every((r) => r.test(v)), 'Le mot de passe ne respecte pas toutes les règles.');

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Les deux mots de passe ne correspondent pas.' });

export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
