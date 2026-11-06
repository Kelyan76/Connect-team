import { KanbanSquare, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Toolbar } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { Kanban } from '../components/Kanban';
import { TaskDialog } from '../components/TaskDialog';
import { TaskList } from '../components/TaskList';
import { PRIORITY, useProjects, useTasks, type Task, type TaskPriority } from '../queries';

export default function TasksPage() {
  const { isManager } = useCurrentUser();
  const tasks = useTasks();
  const projects = useProjects();
  const team = useTeamMembers();
  const [view, setView] = useState('kanban');
  const [person, setPerson] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('');
  const [due, setDue] = useState('');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  useHotkey('n', () => isManager && setEditing('new'));

  const today = todayIso();
  const list = (tasks.data ?? []).filter(
    (t) =>
      (!person || t.assignee_id === person) &&
      (!project || t.project_id === project) &&
      (!priority || t.priority === priority) &&
      (!due ||
        (due === 'retard' && t.status !== 'termine' && !!t.due_date && t.due_date < today) ||
        (due === 'semaine' && !!t.due_date && t.due_date >= today && t.due_date <= isoAddDays(today, 7))),
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Organisation' : 'Mon espace' }, { label: isManager ? 'Tâches' : 'Mes tâches' }]}
        title={isManager ? 'Tâches et projets' : 'Mes tâches'}
        description={isManager ? 'Glissez une carte pour changer son statut.' : 'Faites avancer vos tâches en les glissant d’une colonne à l’autre.'}
        actions={
          isManager && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus aria-hidden />
              Nouvelle tâche
            </Button>
          )
        }
      />
      <Toolbar>
        {isManager && (
          <NativeSelect aria-label="Filtrer par personne" className="w-52" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Toutes les personnes</option>
            {team.active.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect aria-label="Filtrer par projet" className="w-60" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Tous les projets</option>
          {(projects.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filtrer par priorité" className="w-40" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Toutes priorités</option>
          {(Object.keys(PRIORITY) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY[p].label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filtrer par échéance" className="w-44" value={due} onChange={(e) => setDue(e.target.value)}>
          <option value="">Toutes échéances</option>
          <option value="retard">En retard</option>
          <option value="semaine">Sous 7 jours</option>
        </NativeSelect>
        <Segmented value={view} onValueChange={setView} aria-label="Affichage" className="ml-auto">
          <SegmentedItem value="kanban">
            <KanbanSquare aria-hidden />
            Kanban
          </SegmentedItem>
          <SegmentedItem value="liste">
            <List aria-hidden />
            Liste
          </SegmentedItem>
        </Segmented>
      </Toolbar>
      {tasks.error ? (
        <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
      ) : !tasks.data ? (
        <Skeleton className="h-96" />
      ) : view === 'kanban' ? (
        <Kanban tasks={list} projects={projects.data ?? []} byId={team.byId} onOpen={(t) => setEditing(t)} />
      ) : (
        <TaskList tasks={list} projects={projects.data ?? []} byId={team.byId} onOpen={(t) => setEditing(t)} />
      )}
      <TaskDialog task={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}
