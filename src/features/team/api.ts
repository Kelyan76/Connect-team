import { AppError, check, toUserMessage, unwrap } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import type { Tables, TablesUpdate } from '@/shared/types/database';

export type Person = Tables<'profiles'>;
export type ManagerNote = Tables<'manager_notes'>;

export async function listPeople(): Promise<Person[]> {
  return unwrap(await supabase.from('profiles').select('*').order('last_name'), 'Équipe');
}

export async function updatePerson(id: string, patch: TablesUpdate<'profiles'>): Promise<void> {
  check(await supabase.from('profiles').update(patch).eq('id', id), 'Mise à jour fiche');
}

export async function listNotes(collaboratorId: string): Promise<ManagerNote[]> {
  return unwrap(
    await supabase.from('manager_notes').select('*').eq('collaborator_id', collaboratorId).order('created_at', { ascending: false }),
    'Notes privées',
  );
}

export async function addNote(collaboratorId: string, authorId: string, body: string): Promise<void> {
  check(await supabase.from('manager_notes').insert({ collaborator_id: collaboratorId, author_id: authorId, body }), 'Note privée');
}

export async function deleteNote(id: string): Promise<void> {
  check(await supabase.from('manager_notes').delete().eq('id', id), 'Suppression note');
}

export interface InviteInput {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  hired_on: string;
}

/** Edge Function invite-member : crée le compte et envoie l'invitation par e-mail. */
export async function inviteMember(input: InviteInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ id?: string; error?: string }>('invite-member', { body: input });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context ? ((await context.json().catch(() => null)) as { error?: string } | null) : null;
    throw new AppError(payload?.error ?? toUserMessage(error));
  }
  if (data?.error) throw new AppError(data.error);
}

export async function setMemberActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-member', { body: { user_id: userId, action: active ? 'reactiver' : 'desactiver' } });
  if (error) throw new AppError(toUserMessage(error), error);
}

export async function listLogins(): Promise<Tables<'login_events'>[]> {
  return unwrap(await supabase.from('login_events').select('*').order('created_at', { ascending: false }).limit(200), 'Journal');
}
