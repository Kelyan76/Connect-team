import type { Person } from '@/features/team/api';
import { fullName } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import type { Tables } from '@/shared/types/database';
import { singleHolderSkills, trainingSuggestions } from '../lib/risk';

/** Compétences à risque et suggestions de formation (binôme avec l'expert). */
export function TrainingPanel({ skills, levels, people }: { skills: Tables<'skills'>[]; levels: Tables<'skill_levels'>[]; people: Person[] }) {
  const holders = singleHolderSkills(levels);
  const suggestions = trainingSuggestions(levels, people.map((p) => p.id));
  const name = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? fullName(p) : '—';
  };
  return (
    <Panel title="Suggestions de formation" description={`${holders.size} compétences maîtrisées par une seule personne`} flush>
      {suggestions.length === 0 ? (
        <EmptyState title="Aucun risque de dépendance" description="Chaque compétence est maîtrisée par au moins deux personnes." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Compétence</Th>
              <Th>Seul expert</Th>
              <Th>À former</Th>
              <Th align="right">Niveau actuel</Th>
              <Th>Proposition</Th>
            </tr>
          </THead>
          <TBody>
            {suggestions.map((s) => {
              const skill = skills.find((k) => k.id === s.skill_id);
              return (
                <Tr key={s.skill_id}>
                  <Td className="font-medium">{skill?.name}</Td>
                  <Td className="text-fg-muted">{name(holders.get(s.skill_id) ?? '')}</Td>
                  <Td>{name(s.collaborator_id)}</Td>
                  <Td numeric>{s.from || '—'}</Td>
                  <Td className="text-fg-muted">{s.from >= 2 ? 'Binôme sur les prochains chantiers' : 'Formation initiale puis binôme'}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}
