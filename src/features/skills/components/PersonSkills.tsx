import { Check } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import type { Tables } from '@/shared/types/database';
import { LEVEL_LABEL } from '../lib/risk';
import { useValidateLevel } from '../queries';

const SWATCH = ['bg-surface-muted text-fg-subtle', 'bg-level-1 text-fg', 'bg-level-2 text-fg', 'bg-level-3 text-white', 'bg-level-4 text-white'];

/**
 * Compétences sur téléphone (manager) : un collaborateur à la fois, choisi dans un menu,
 * avec ses niveaux validés et les auto-évaluations à valider en un toucher.
 */
export function PersonSkills({ skills, levels, people }: { skills: Tables<'skills'>[]; levels: Tables<'skill_levels'>[]; people: Person[] }) {
  const validate = useValidateLevel();
  const categories = [...new Set(skills.map((s) => s.category))].sort((a, b) => a.localeCompare(b));
  const pendingCount = (id: string) => levels.filter((l) => l.collaborator_id === id && l.self_level && !l.validated_at).length;
  // On ouvre sur le premier collaborateur qui a une auto-évaluation à valider.
  const [personId, setPersonId] = useState(() => (people.find((p) => pendingCount(p.id) > 0) ?? people[0])?.id ?? '');

  return (
    <div className="flex flex-col gap-4">
      <NativeSelect aria-label="Collaborateur" value={personId} onChange={(e) => setPersonId(e.target.value)}>
        {people.map((p) => {
          const n = pendingCount(p.id);
          return (
            <option key={p.id} value={p.id}>
              {fullName(p)}
              {n ? ` · ${n} à valider` : ''}
            </option>
          );
        })}
      </NativeSelect>

      {categories.map((cat) => (
        <Panel key={cat} title={cat} flush>
          <ul className="stagger divide-y divide-line">
            {skills
              .filter((s) => s.category === cat)
              .map((s) => {
                const level = levels.find((l) => l.skill_id === s.id && l.collaborator_id === personId);
                const validated = level?.manager_level ?? 0;
                const pending = level?.self_level && !level.validated_at ? level.self_level : null;
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1 text-base">{s.name}</span>
                    {pending ? (
                      <Button size="sm" variant="primary" onClick={() => validate.mutate({ collaboratorId: personId, skillId: s.id, level: pending })}>
                        <Check aria-hidden />
                        Valider {pending}
                      </Button>
                    ) : null}
                    <span
                      title={validated ? LEVEL_LABEL[validated] : 'Non évalué'}
                      className={cn('tabular flex size-8 shrink-0 items-center justify-center rounded text-sm font-semibold', SWATCH[validated])}
                    >
                      {validated || '—'}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
