import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import type { Tables } from '@/shared/types/database';
import { LEVEL_LABEL } from '../lib/risk';
import { useSelfAssess } from '../queries';

/** Auto-évaluation du collaborateur, niveau validé par le manager en regard. */
export function SelfAssessment({ skills, levels }: { skills: Tables<'skills'>[]; levels: Tables<'skill_levels'>[] }) {
  const assess = useSelfAssess();
  return (
    <div className="rounded-lg border border-line bg-surface">
      <Table>
        <THead>
          <tr>
            <Th>Compétence</Th>
            <Th>Domaine</Th>
            <Th>Mon auto-évaluation</Th>
            <Th>Niveau validé</Th>
          </tr>
        </THead>
        <TBody>
          {skills.map((s) => {
            const level = levels.find((l) => l.skill_id === s.id);
            return (
              <Tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-fg-muted">{s.category}</Td>
                <Td>
                  <div role="radiogroup" aria-label={`Auto-évaluation ${s.name}`} className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={level?.self_level === n}
                        title={LEVEL_LABEL[n]}
                        onClick={() => assess.mutate({ skillId: s.id, level: n })}
                        className={cn(
                          'tabular size-7 rounded-sm border text-xs font-medium transition-colors',
                          level?.self_level === n ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-surface hover:bg-surface-muted',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </Td>
                <Td>
                  {level?.manager_level ? (
                    <span className="text-sm">
                      {level.manager_level} · {LEVEL_LABEL[level.manager_level]}
                    </span>
                  ) : (
                    <span className="text-sm text-fg-subtle">—</span>
                  )}
                  {level?.self_level && !level.validated_at && (
                    <Badge tone="warning" className="ml-2">
                      En attente
                    </Badge>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
