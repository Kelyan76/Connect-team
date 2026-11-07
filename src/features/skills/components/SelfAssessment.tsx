import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Panel } from '@/shared/ui/layout';
import type { Tables } from '@/shared/types/database';
import { LEVEL_LABEL } from '../lib/risk';
import { useSelfAssess } from '../queries';

const LEVEL_ON = ['', 'bg-level-1 text-fg border-level-2', 'bg-level-2 text-fg border-level-3', 'bg-level-3 text-white border-level-3', 'bg-level-4 text-white border-level-4'];

/**
 * Auto-évaluation du collaborateur : une carte par compétence, regroupées par domaine,
 * quatre niveaux sur toute la largeur (aucun défilement horizontal), niveau validé par le manager en dessous.
 */
export function SelfAssessment({ skills, levels }: { skills: Tables<'skills'>[]; levels: Tables<'skill_levels'>[] }) {
  const assess = useSelfAssess();
  const categories = [...new Set(skills.map((s) => s.category))].sort((a, b) => a.localeCompare(b));
  const assessed = skills.filter((s) => levels.some((l) => l.skill_id === s.id && l.self_level)).length;
  const autonomous = levels.filter((l) => (l.manager_level ?? 0) >= 3).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="stagger grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="tabular text-xl font-semibold">
            {assessed}
            <span className="text-base font-normal text-fg-subtle"> / {skills.length}</span>
          </p>
          <p className="text-sm text-fg-muted">Compétences évaluées</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
          <p className="tabular text-xl font-semibold">{autonomous}</p>
          <p className="text-sm text-fg-muted">Autonome ou expert (validé)</p>
        </div>
      </div>

      {categories.map((cat) => (
        <Panel key={cat} title={cat} flush>
          <ul className="stagger divide-y divide-line">
            {skills
              .filter((s) => s.category === cat)
              .map((s) => {
                const level = levels.find((l) => l.skill_id === s.id);
                const pending = !!level?.self_level && !level.validated_at;
                return (
                  <li key={s.id} className="flex flex-col gap-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-base font-medium">{s.name}</span>
                      {level?.manager_level ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle2 className="size-4" aria-hidden />
                          Validé : {LEVEL_LABEL[level.manager_level]}
                        </span>
                      ) : pending ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-warning">
                          <Clock className="size-4" aria-hidden />
                          En attente
                        </span>
                      ) : null}
                    </div>
                    <div role="radiogroup" aria-label={`Mon niveau en ${s.name}`} className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((n) => {
                        const on = level?.self_level === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => assess.mutate({ skillId: s.id, level: n })}
                            className={cn(
                              'flex flex-col items-center gap-px rounded border px-1 py-2 transition-all duration-200 active:scale-95',
                              on ? cn(LEVEL_ON[n], 'shadow-sm') : 'border-line bg-surface text-fg-muted hover:border-line-strong',
                            )}
                          >
                            <span className="tabular text-base font-semibold">{n}</span>
                            <span className="text-[11px] leading-tight">{LEVEL_LABEL[n]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
