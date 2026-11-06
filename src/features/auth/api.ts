import { AppError, check, toUserMessage, unwrap } from '@/shared/lib/errors';
import { isLocalBackend, supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';

export type Profile = Tables<'profiles'>;
export type Team = Tables<'teams'>;

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AppError(toUserMessage(error), error);
  // Journal des connexions : un échec ici ne doit pas bloquer l'accès.
  const { error: logError } = await supabase.rpc('record_login', { p_user_agent: navigator.userAgent.slice(0, 400) });
  if (logError) console.error('Journal des connexions', logError);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/nouveau-mot-de-passe`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new AppError(toUserMessage(error), error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AppError(toUserMessage(error), error);
}

export async function fetchProfile(userId: string): Promise<Profile> {
  return unwrap(await supabase.from('profiles').select('*').eq('id', userId).single(), 'Profil');
}

export async function fetchTeam(teamId: string): Promise<Team> {
  return unwrap(await supabase.from('teams').select('*').eq('id', teamId).single(), 'Équipe');
}

/** Lien reçu par e-mail dans la démonstration embarquée (invitation ou réinitialisation). */
export async function openLocalEmailLink(type: string, token: string): Promise<void> {
  if (!isLocalBackend) throw new AppError('Ce lien n’est valable que dans la démonstration.');
  const [{ getDb }, { verifyEmailLink }] = await Promise.all([import('@/backend/local/db'), import('@/backend/local/auth')]);
  const session = await verifyEmailLink(await getDb(), type, token);
  if (!session) throw new AppError('Ce lien a déjà été utilisé ou a expiré. Demandez un nouvel e-mail.');
  check(await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }));
}
