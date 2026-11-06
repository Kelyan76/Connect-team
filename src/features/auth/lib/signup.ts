import { z } from 'zod';
import { passwordSchema } from './password';

/**
 * Inscription d'un manager : règles partagées entre le formulaire, le backend embarqué
 * et l'Edge Function supabase/functions/signup-manager (qui en garde une copie, Deno oblige).
 */
export const signupSchema = z.object({
  code: z.string().trim().min(1, 'Saisissez le code d’accès fourni par votre groupe.'),
  first_name: z.string().trim().min(1, 'Saisissez votre prénom.').max(60),
  last_name: z.string().trim().min(1, 'Saisissez votre nom.').max(60),
  job_title: z.string().trim().min(2, 'Indiquez votre fonction.').max(80),
  company: z.string().trim().min(2, 'Indiquez votre entreprise.').max(120),
  team_name: z.string().trim().min(2, 'Nommez votre équipe.').max(120),
  email: z
    .string()
    .trim()
    .min(1, 'Saisissez votre adresse e-mail.')
    .email('Adresse e-mail invalide.'),
  password: passwordSchema,
});
export type SignupValues = z.infer<typeof signupSchema>;

/** Code d'accès de la démonstration embarquée (sans Supabase). En production : secret SIGNUP_CODE. */
export const LOCAL_SIGNUP_CODE = 'CADENCE';

/** Domaine réservé (RFC 2606) : aucun e-mail ne peut partir vers ces comptes fictifs. */
export const DEMO_EMAIL_DOMAIN = 'cadence-demo.example';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const demoEmail = (first: string, last: string, tag: string) =>
  `${slug(first)}.${slug(last)}.${tag}@${DEMO_EMAIL_DOMAIN}`;

function randomChars(alphabet: string, n: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Suffixe court qui rend uniques les adresses de démonstration d'une équipe. */
export const demoTag = () => randomChars('abcdefghjkmnpqrstuvwxyz23456789', 4);

/** Mot de passe commun aux comptes démo d'une équipe ; respecte les règles (majuscule, chiffre, spécial…). */
export const demoPassword = () =>
  `Demo-${randomChars('abcdefghjkmnpqrstuvwxyz', 6)}-${randomChars('0123456789', 2)}`;
