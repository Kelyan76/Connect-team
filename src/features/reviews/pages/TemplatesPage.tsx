import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { TemplateQuestion } from '../api';
import { KIND_LABEL } from '../lib/review-rules';
import { useDeleteQuestion, useSaveQuestion, useTemplateQuestions, useTemplates } from '../queries';

const TYPE_LABEL: Record<TemplateQuestion['type'], string> = { texte: 'Texte libre', echelle: 'Échelle de 1 à 5', choix: 'Choix multiple', oui_non: 'Oui / non' };

function NewQuestion({ templateId, position }: { templateId: string; position: number }) {
  const save = useSaveQuestion();
  const [label, setLabel] = useState('');
  const [section, setSection] = useState('');
  const [type, setType] = useState<TemplateQuestion['type']>('texte');
  const [options, setOptions] = useState('');
  const valid = label.trim().length >= 3 && (type !== 'choix' || options.split(';').filter((o) => o.trim()).length >= 2);
  return (
    <form
      className="grid gap-3 border-t border-line p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        save.mutate(
          { template_id: templateId, position, label: label.trim(), section: section.trim(), type, options: type === 'choix' ? options.split(';').map((o) => o.trim()).filter(Boolean) : [] },
          { onSuccess: () => { setLabel(''); setOptions(''); } },
        );
      }}
    >
      <Field label="Nouvelle question">
        <Input value={label} maxLength={300} onChange={(e) => setLabel(e.target.value)} placeholder="Intitulé de la question" />
      </Field>
      <Field label="Section" optional>
        <Input value={section} maxLength={80} onChange={(e) => setSection(e.target.value)} />
      </Field>
      <Field label="Type">
        <NativeSelect value={type} onChange={(e) => setType(e.target.value as TemplateQuestion['type'])}>
          {Object.entries(TYPE_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" disabled={!valid || save.isPending}>
        <Plus aria-hidden />
        Ajouter
      </Button>
      {type === 'choix' && (
        <Field label="Options" hint="Séparées par un point-virgule, au moins deux." className="md:col-span-4">
          <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Formation ; Renfort ponctuel ; Outils" />
        </Field>
      )}
    </form>
  );
}

export default function TemplatesPage() {
  const templates = useTemplates();
  const questions = useTemplateQuestions();
  const save = useSaveQuestion();
  const remove = useDeleteQuestion();
  const [toDelete, setToDelete] = useState<TemplateQuestion | null>(null);

  const move = (list: TemplateQuestion[], index: number, delta: number) => {
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    save.mutate({ ...a, position: b.position });
    save.mutate({ ...b, position: a.position });
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Équipe' }, { label: 'Entretiens', to: '/entretiens' }, { label: 'Trames' }]}
        title="Trames d’entretien"
        description="Les modifications s’appliquent aux prochains entretiens planifiés. Les entretiens existants conservent leurs questions."
      />
      {templates.error ? (
        <ErrorState error={templates.error} />
      ) : !templates.data || !questions.data ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue={templates.data[0]?.id}>
          <TabsList>
            {templates.data.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {KIND_LABEL[t.kind]}
              </TabsTrigger>
            ))}
          </TabsList>
          {templates.data.map((t) => {
            const list = questions.data.filter((q) => q.template_id === t.id).sort((a, b) => a.position - b.position);
            return (
              <TabsContent key={t.id} value={t.id}>
                <Panel title={t.name} description={t.description} flush>
                  <ol className="divide-y divide-line">
                    {list.map((q, i) => (
                      <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="tabular w-6 text-sm text-fg-subtle">{i + 1}</span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-base">{q.label}</span>
                          <span className="text-xs text-fg-subtle">
                            {q.section || 'Sans section'}
                            {q.type === 'choix' && Array.isArray(q.options) ? ` · ${(q.options as string[]).join(' · ')}` : ''}
                          </span>
                        </div>
                        <Badge tone="outline">{TYPE_LABEL[q.type]}</Badge>
                        <Button size="icon-sm" variant="ghost" aria-label="Monter" disabled={i === 0} onClick={() => move(list, i, -1)}>
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Descendre" disabled={i === list.length - 1} onClick={() => move(list, i, 1)}>
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Supprimer la question" onClick={() => setToDelete(q)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <NewQuestion templateId={t.id} position={(list[list.length - 1]?.position ?? 0) + 1} />
                </Panel>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette question ?"
        description={`« ${toDelete?.label ?? ''} » ne sera plus posée lors des prochains entretiens.`}
        confirmLabel="Supprimer"
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </Page>
  );
}
