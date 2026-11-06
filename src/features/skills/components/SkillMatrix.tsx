import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from '@/shared/ui/menu';
import type { Tables } from '@/shared/types/database';
import { effectiveLevel, isPendingValidation, LEVEL_LABEL, singleHolderSkills } from '../lib/risk';
import { useValidateLevel } from '../queries';

type Skill = Tables<'skills'>;
type Level = Tables<'skill_levels'>;

const LEVEL_BG = ['bg-level-0 text-fg-subtle', 'bg-level-1 text-fg', 'bg-level-2 text-fg', 'bg-level-3 text-white', 'bg-level-4 text-accent-fg'];

function Cell({ person, skill, level }: { person: Person; skill: Skill; level: Level | undefined }) {
  const validate = useValidateLevel();
  const [open, setOpen] = useState(false);
  const value = effectiveLevel(level);
  const pending = isPendingValidation(level);
  const set = (n: number | null) => validate.mutate({ collaboratorId: person.id, skillId: skill.id, level: n }, { onSuccess: () => setOpen(false) });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn('tabular mx-auto flex h-7 w-8 items-center justify-center rounded-sm text-xs font-semibold', LEVEL_BG[value], pending && 'ring-2 ring-inset ring-warning')}
        aria-label={`${fullName(person)}, ${skill.name} : ${value ? `niveau ${value}` : 'non évalué'}${pending ? ', auto-évaluation à valider' : ''}`}
      >
        {value || '·'}
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{skill.name}</span>
            <span className="text-xs text-fg-subtle">{fullName(person)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-fg-subtle">Auto-évaluation</dt>
            <dd className="tabular">{level?.self_level ?? '—'}</dd>
            <dt className="text-fg-subtle">Niveau validé</dt>
            <dd className="tabular">{level?.manager_level ?? '—'}</dd>
          </dl>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Fixer le niveau">
            {[1, 2, 3, 4].map((n) => (
              <Tooltip key={n} content={LEVEL_LABEL[n]}>
                <Button size="sm" variant={level?.manager_level === n ? 'primary' : 'secondary'} onClick={() => set(n)}>
                  {n}
                </Button>
              </Tooltip>
            ))}
          </div>
          {pending && level?.self_level && (
            <Button size="sm" variant="primary" onClick={() => set(level.self_level)}>
              Valider l’auto-évaluation ({level.self_level})
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Tableau collaborateurs × compétences, regroupées par domaine. */
export function SkillMatrix({ skills, levels, people }: { skills: Skill[]; levels: Level[]; people: Person[] }) {
  const risky = singleHolderSkills(levels);
  const categories = [...new Set(skills.map((s) => s.category))];
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b border-line bg-surface-muted/50">
            <th scope="col" className="sticky left-0 z-10 min-w-56 bg-surface px-4 text-left text-xs font-medium text-fg-subtle">
              Compétence
            </th>
            {people.map((p) => (
              <th key={p.id} scope="col" className="h-24 px-1 align-bottom">
                <Tooltip content={`${fullName(p)} · ${p.job_title}`}>
                  <span className="flex flex-col items-center gap-1 pb-2">
                    <Avatar person={p} size="sm" />
                    <span className="text-xs font-medium text-fg-muted">{p.first_name}</span>
                  </span>
                </Tooltip>
              </th>
            ))}
            <th scope="col" className="px-3 text-right text-xs font-medium text-fg-subtle">
              Experts
            </th>
          </tr>
        </thead>
        {categories.map((cat) => (
          <tbody key={cat}>
            <tr>
              <th colSpan={people.length + 2} scope="colgroup" className="sticky left-0 bg-canvas px-4 py-1 text-left text-xs font-medium text-fg-subtle">
                {cat}
              </th>
            </tr>
            {skills
              .filter((s) => s.category === cat)
              .map((skill) => {
                const experts = levels.filter((l) => l.skill_id === skill.id && (l.manager_level ?? 0) >= 3).length;
                return (
                  <tr key={skill.id} className="border-t border-line hover:bg-surface-muted/40">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-1 text-left text-base font-normal">
                      <span className="flex items-center gap-2">
                        {skill.name}
                        {risky.has(skill.id) && (
                          <Tooltip content="Compétence détenue par une seule personne">
                            <AlertTriangle className="size-4 shrink-0 text-warning" aria-label="Risque : une seule personne maîtrise cette compétence" />
                          </Tooltip>
                        )}
                      </span>
                    </th>
                    {people.map((p) => (
                      <td key={p.id} className="px-1 py-1">
                        <Cell person={p} skill={skill} level={levels.find((l) => l.skill_id === skill.id && l.collaborator_id === p.id)} />
                      </td>
                    ))}
                    <td className={cn('tabular px-3 text-right text-sm', experts <= 1 ? 'font-medium text-warning' : 'text-fg-muted')}>{experts}</td>
                  </tr>
                );
              })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
