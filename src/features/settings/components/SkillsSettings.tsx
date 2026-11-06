import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAddSkill, useDeleteSkill, useSkills } from '@/features/skills/queries';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';

/** Référentiel des compétences de l'équipe. */
export function SkillsSettings() {
  const skills = useSkills();
  const add = useAddSkill();
  const remove = useDeleteSkill();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  if (!skills.data) return <Skeleton className="h-80" />;
  const categories = [...new Set(skills.data.map((s) => s.category))];

  return (
    <Panel title="Référentiel des compétences" description={`${skills.data.length} compétences dans ${categories.length} domaines`} flush>
      <Table>
        <THead>
          <tr>
            <Th>Compétence</Th>
            <Th>Domaine</Th>
            <Th className="sr-only">Actions</Th>
          </tr>
        </THead>
        <TBody>
          {skills.data.map((s) => (
            <Tr key={s.id}>
              <Td className="font-medium">{s.name}</Td>
              <Td className="text-fg-muted">{s.category}</Td>
              <Td align="right">
                <Button size="icon-sm" variant="ghost" aria-label={`Supprimer ${s.name}`} onClick={() => setToDelete(s)}>
                  <Trash2 aria-hidden />
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <form
        className="grid gap-3 border-t border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2 && category.trim().length >= 2) add.mutate({ name: name.trim(), category: category.trim() }, { onSuccess: () => setName('') });
        }}
      >
        <Field label="Nouvelle compétence">
          <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Domaine">
          <Input value={category} maxLength={60} list="skill-categories" onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <datalist id="skill-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button type="submit" disabled={name.trim().length < 2 || category.trim().length < 2}>
          <Plus aria-hidden />
          Ajouter
        </Button>
      </form>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer « ${toDelete?.name ?? ''} » ?`}
        description="Les niveaux évalués pour cette compétence seront aussi supprimés."
        confirmLabel="Supprimer"
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </Panel>
  );
}
