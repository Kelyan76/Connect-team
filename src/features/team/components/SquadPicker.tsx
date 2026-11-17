import { Users } from 'lucide-react';
import { NativeSelect } from '@/shared/ui/input';
import type { Person } from '../api';
import { useAssignSquad, useSquads } from '../squads';

/** Équipe d'un collaborateur, modifiable par le manager depuis sa fiche. */
export function SquadPicker({ person }: { person: Person }) {
  const squads = useSquads();
  const assign = useAssignSquad();
  if (!squads.data?.length) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-fg-muted">
      <Users className="size-4" aria-hidden />
      Équipe
      <NativeSelect
        aria-label={`Équipe de ${person.first_name}`}
        className="h-8 w-48"
        value={person.squad_id ?? ''}
        disabled={assign.isPending}
        onChange={(e) => assign.mutate({ personId: person.id, squadId: e.target.value || null })}
      >
        <option value="">Aucune</option>
        {squads.data.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
