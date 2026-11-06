import { useLogins, useTeamMembers } from '@/features/team/queries';
import { formatDate, formatTime } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { ErrorState, TableSkeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';

/** Journal des connexions de l'équipe (200 dernières). */
export function LoginLog() {
  const logins = useLogins();
  const team = useTeamMembers();
  return (
    <Panel title="Journal des connexions" description="Les 200 dernières connexions à l’application" flush>
      {logins.error ? (
        <ErrorState error={logins.error} />
      ) : !logins.data ? (
        <TableSkeleton rows={8} columns={4} />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th align="right">Date</Th>
              <Th align="right">Heure</Th>
              <Th>Utilisateur</Th>
              <Th>Navigateur</Th>
            </tr>
          </THead>
          <TBody>
            {logins.data.map((l) => {
              const p = team.byId.get(l.user_id);
              return (
                <Tr key={l.id}>
                  <Td numeric>{formatDate(l.created_at)}</Td>
                  <Td numeric>{formatTime(l.created_at)}</Td>
                  <Td>{p ? <PersonLabel person={p} size="xs" /> : '—'}</Td>
                  <Td className="max-w-90 truncate text-fg-muted" title={l.user_agent ?? undefined}>
                    {l.user_agent ?? '—'}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}
