import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { qk } from '@/shared/lib/query-keys';
import { toast } from '@/shared/ui/toaster';
import * as api from './api';

export function usePeople() {
  return useQuery({ queryKey: qk.people, queryFn: api.listPeople });
}

/** Collaborateurs actifs (hors manager), triés par nom ; et un index par identifiant. */
export function useTeamMembers() {
  const query = usePeople();
  return useMemo(() => {
    const all = query.data ?? [];
    const byId = new Map(all.map((p) => [p.id, p]));
    const members = all.filter((p) => p.role === 'collaborateur');
    return { ...query, all, byId, members, active: members.filter((p) => p.is_active) };
  }, [query]);
}

export function useNotes(collaboratorId: string, enabled: boolean) {
  return useQuery({ queryKey: qk.managerNotes(collaboratorId), queryFn: () => api.listNotes(collaboratorId), enabled });
}

export function useAddNote(collaboratorId: string, authorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addNote(collaboratorId, authorId, body),
    onSuccess: () => {
      toast.success('Note enregistrée');
      return qc.invalidateQueries({ queryKey: qk.managerNotes(collaboratorId) });
    },
  });
}

export function useDeleteNote(collaboratorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      toast.success('Note supprimée');
      return qc.invalidateQueries({ queryKey: qk.managerNotes(collaboratorId) });
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.inviteMember,
    meta: { silent: true },
    onSuccess: (_d, input) => {
      toast.success(`Invitation envoyée à ${input.email}`);
      return qc.invalidateQueries({ queryKey: qk.people });
    },
  });
}

export function useSetActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.setMemberActive(id, active),
    onSuccess: (_d, v) => {
      toast.success(v.active ? 'Compte réactivé' : 'Compte désactivé');
      return qc.invalidateQueries({ queryKey: qk.people });
    },
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updatePerson>[1] }) => api.updatePerson(id, patch),
    onSuccess: () => {
      toast.success('Fiche mise à jour');
      return qc.invalidateQueries({ queryKey: qk.people });
    },
  });
}

export function useLogins(enabled = true) {
  return useQuery({ queryKey: qk.logins, queryFn: api.listLogins, enabled });
}
