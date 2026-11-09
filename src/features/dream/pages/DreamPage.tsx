import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeamMembers } from '@/features/team/queries';
import { PersonLabel } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState, TableSkeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { LeverChips } from '../components/LeverChips';
import { LEVER_ORDER, LEVER_STATUS, LEVERS, leversToActivate, type Lever } from '../lib/dream';
import { useDreamStates } from '../queries';

/** « Comment je crée et j'entretiens le lien ? » : les leviers DREAM de chaque collaborateur. */
export default function DreamPage() {
  const team = useTeamMembers();
  const dream = useDreamStates();
  const [focus, setFocus] = useState<Lever | ''>('');

  const rows = team.active
    .map((p) => ({ p, states: dream.data?.get(p.id) ?? [] }))
    .filter((r) => !focus || r.states.find((s) => s.lever === focus)?.status !== 'ok')
    .sort((a, b) => leversToActivate(b.states).length - leversToActivate(a.states).length);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Équipe' }, { label: 'Leviers DREAM' }]}
        title="Entretenir l’engagement"
        description="Pour chaque collaborateur, les leviers activés récemment et ceux à activer. Un aide-mémoire pour le manager, pas une note du collaborateur."
      />
      <div className="stagger mb-6 grid gap-3 sm:grid-cols-5">
        {LEVER_ORDER.map((l) => (
          <div key={l} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-3 shadow-sm">
            <span className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-sec-team/10 text-sm font-semibold text-sec-team">{l}</span>
              <span className="text-sm font-medium">{LEVERS[l].name}</span>
            </span>
            <span className="text-xs text-fg-subtle">{LEVERS[l].meaning}</span>
          </div>
        ))}
      </div>
      <Panel
        title="Mon équipe"
        description="Survolez une lettre pour le détail. Une action par levier à activer."
        actions={
          <NativeSelect aria-label="Filtrer par levier" className="w-52" value={focus} onChange={(e) => setFocus(e.target.value as Lever | '')}>
            <option value="">Tous les leviers</option>
            {LEVER_ORDER.map((l) => (
              <option key={l} value={l}>
                {LEVERS[l].name} à travailler
              </option>
            ))}
          </NativeSelect>
        }
        flush
      >
        {!dream.data ? (
          <TableSkeleton rows={5} columns={3} />
        ) : rows.length === 0 ? (
          <EmptyState title="Rien à activer" description="Ce levier est activé pour toute l’équipe." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ p, states }) => {
              const todo = leversToActivate(states).filter((s) => !focus || s.lever === focus);
              return (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                  <Link to={`/equipe/${p.id}`} className="min-w-0 md:w-56">
                    <PersonLabel person={p} />
                  </Link>
                  <LeverChips states={states} />
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2 md:justify-end">
                    {todo.length === 0 ? (
                      <span className="text-sm text-fg-subtle">{LEVER_STATUS.ok.label} ou à entretenir</span>
                    ) : (
                      todo.map((s) => (
                        <Button key={s.lever} asChild size="sm">
                          <Link to={LEVERS[s.lever].to(p.id)} title={s.detail}>
                            {LEVERS[s.lever].actionLabel}
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                      ))
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
