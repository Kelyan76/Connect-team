import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Tooltip } from '@/shared/ui/menu';
import { DELEGATION, useDelegations, useDomains, useSetDelegation, type DelegationLevel } from '../queries';

const ORDER: DelegationLevel[] = ['execute', 'propose', 'decide'];
const CELL: Record<DelegationLevel, string> = {
  decide: 'bg-success-subtle text-success',
  propose: 'bg-accent-subtle text-accent',
  execute: 'bg-surface-muted text-fg-muted',
};

/** Matrice de délégation : qui décide seul, qui propose, qui exécute, par type de décision. */
export function DelegationMatrix() {
  const { isManager, profile } = useCurrentUser();
  const domains = useDomains();
  const delegations = useDelegations();
  const team = useTeamMembers();
  const set = useSetDelegation();
  const people = isManager ? team.active : [profile];
  const level = (pid: string, did: string) => delegations.data?.find((d) => d.collaborator_id === pid && d.domain_id === did)?.level;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
        {ORDER.slice().reverse().map((l) => (
          <span key={l} className="inline-flex items-center gap-2">
            <Badge tone={DELEGATION[l].tone}>{DELEGATION[l].short}</Badge>
            {DELEGATION[l].help}
          </span>
        ))}
      </div>
      {domains.error ?? delegations.error ? (
        <ErrorState error={domains.error ?? delegations.error} />
      ) : !domains.data || !delegations.data ? (
        <Skeleton className="h-96" />
      ) : (
        <Panel flush>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-base">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50">
                  <th scope="col" className="sticky left-0 z-10 h-20 min-w-64 bg-surface px-4 text-left text-xs font-medium text-fg-subtle">
                    Type de décision
                  </th>
                  {people.map((p) => (
                    <th key={p.id} scope="col" className="px-2 align-bottom">
                      <span className="flex flex-col items-center gap-1 pb-2">
                        <Avatar person={p} size="sm" />
                        <span className="whitespace-nowrap text-xs font-medium text-fg-muted">{isManager ? p.first_name : 'Moi'}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {domains.data.map((d) => (
                  <tr key={d.id}>
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2 text-left font-normal">
                      <span className="flex flex-col">
                        <span className="text-base">{d.name}</span>
                        {d.description && <span className="text-xs text-fg-subtle">{d.description}</span>}
                      </span>
                    </th>
                    {people.map((p) => {
                      const l = level(p.id, d.id);
                      const content = (
                        <span className={cn('flex h-7 min-w-20 items-center justify-center rounded-sm px-2 text-xs font-medium', l ? CELL[l] : 'text-fg-subtle')}>
                          {l ? DELEGATION[l].short : '—'}
                        </span>
                      );
                      return (
                        <td key={p.id} className="px-2 py-2 text-center">
                          {isManager ? (
                            <Tooltip content={`${fullName(p)} · ${l ? DELEGATION[l].label : 'non défini'} · cliquer pour changer`}>
                              <button
                                type="button"
                                className="w-full rounded-sm"
                                aria-label={`${fullName(p)}, ${d.name} : ${l ? DELEGATION[l].label : 'non défini'}. Changer de niveau`}
                                onClick={() => set.mutate({ collaborator_id: p.id, domain_id: d.id, level: ORDER[(ORDER.indexOf(l ?? 'decide') + 1) % 3] })}
                              >
                                {content}
                              </button>
                            </Tooltip>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
