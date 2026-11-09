import { CheckCheck, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/input';
import { AUTONOMY, useCloseMission, useMissions, type Mission } from '../queries';

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="text-fg-subtle">{label} : </span>
      {value}
    </p>
  );
}

/** Missions confiées : en cours, puis terminées avec leur bilan. */
export function MissionList({ isManager, onEdit, onNew }: { isManager: boolean; onEdit: (m: Mission) => void; onNew: () => void }) {
  const missions = useMissions();
  const team = useTeamMembers();
  const close = useCloseMission();
  const [closing, setClosing] = useState<Mission | null>(null);
  const [debrief, setDebrief] = useState('');

  if (!missions.data) return <Skeleton className="h-64" />;
  if (missions.data.length === 0) {
    return (
      <EmptyState
        title="Aucune mission confiée"
        description={isManager ? 'Identifiez chaque semaine au moins une tâche qui peut être confiée. Commencer petit, construire la confiance.' : 'Votre manager ne vous a pas encore confié de mission.'}
        action={isManager ? <Button onClick={onNew}>Confier une mission</Button> : undefined}
      />
    );
  }

  return (
    <>
      <ul className="stagger grid gap-4 lg:grid-cols-2">
        {missions.data.map((m) => {
          const p = team.byId.get(m.collaborator_id);
          const done = m.status === 'terminee';
          return (
            <li key={m.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {isManager && p ? <PersonLabel person={p} size="xs" /> : <span />}
                <span className="flex items-center gap-2">
                  <Badge tone="accent">
                    Autonomie {m.autonomy}/5 · {AUTONOMY[m.autonomy]?.label}
                  </Badge>
                  <Badge tone={done ? 'success' : 'neutral'}>{done ? 'Terminée' : m.due_date ? `Pour le ${formatDate(m.due_date)}` : 'En cours'}</Badge>
                </span>
              </div>
              <h3 className="text-md font-semibold">{m.title}</h3>
              <div className="flex flex-col gap-1">
                <Line label="Résultat attendu" value={m.expected_result} />
                <Line label="Limites" value={m.limits} />
                <Line label="Accompagnement" value={m.support} />
                <Line label="Points de contrôle" value={m.checkpoints} />
                {done && <Line label="Bilan" value={m.debrief} />}
              </div>
              {isManager && !done && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onEdit(m)}>
                    <Pencil aria-hidden />
                    Ajuster
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDebrief('');
                      setClosing(m);
                    }}
                  >
                    <CheckCheck aria-hidden />
                    Faire le bilan
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog open={closing !== null} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent
          title="Évaluer les résultats avec le délégué"
          description="Qu’est-ce qui a bien fonctionné ? Qu’est-ce qui peut être amélioré ? Puis déléguer à nouveau, un peu plus loin."
          footer={
            <>
              <Button onClick={() => setClosing(null)}>Annuler</Button>
              <Button
                variant="primary"
                disabled={debrief.trim().length < 3 || close.isPending}
                onClick={() => closing && close.mutate({ id: closing.id, debrief: debrief.trim() }, { onSuccess: () => setClosing(null) })}
              >
                Clore la mission
              </Button>
            </>
          }
        >
          <Field label="Bilan partagé" hint="Valorisez systématiquement les points positifs ; aidez sur les axes d’amélioration.">
            <Textarea rows={4} maxLength={1000} value={debrief} onChange={(e) => setDebrief(e.target.value)} />
          </Field>
        </DialogContent>
      </Dialog>
    </>
  );
}
