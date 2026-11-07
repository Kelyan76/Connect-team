import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { PersonSkills } from '../components/PersonSkills';
import { SelfAssessment } from '../components/SelfAssessment';
import { SkillMatrix } from '../components/SkillMatrix';
import { TrainingPanel } from '../components/TrainingPanel';
import { LEVEL_LABEL } from '../lib/risk';
import { useSkillLevels, useSkills } from '../queries';

const SWATCH = ['', 'bg-level-1', 'bg-level-2', 'bg-level-3', 'bg-level-4'];

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className="inline-flex items-center gap-2">
          <span className={`inline-block size-3 rounded-sm ${SWATCH[n]}`} aria-hidden />
          {n} · {LEVEL_LABEL[n]}
        </span>
      ))}
      <span className="inline-flex items-center gap-2">
        <span className="inline-block size-3 rounded-sm border-2 border-warning" aria-hidden />
        Auto-évaluation à valider
      </span>
    </div>
  );
}

export default function SkillsPage() {
  const { isManager, profile } = useCurrentUser();
  const skills = useSkills();
  const levels = useSkillLevels();
  const team = useTeamMembers();
  const error = skills.error ?? levels.error;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon espace' }, { label: isManager ? 'Compétences' : 'Mes compétences' }]}
        title={isManager ? 'Matrice de compétences' : 'Mes compétences'}
        description={
          isManager
            ? 'Niveaux validés de 1 à 4 et auto-évaluations à valider.'
            : 'Choisissez votre niveau sur chaque compétence ; votre manager le valide.'
        }
        meta={isManager ? <div className="hidden md:block"><Legend /></div> : undefined}
      />
      {error ? (
        <ErrorState error={error} />
      ) : !skills.data || !levels.data || team.isLoading ? (
        <Skeleton className="h-96" />
      ) : isManager ? (
        <>
          <div className="md:hidden">
            <PersonSkills skills={skills.data} levels={levels.data} people={team.active} />
          </div>
          <div className="hidden flex-col gap-6 md:flex">
            <SkillMatrix skills={skills.data} levels={levels.data} people={team.active} />
            <TrainingPanel skills={skills.data} levels={levels.data} people={team.active} />
          </div>
        </>
      ) : (
        <SelfAssessment skills={skills.data} levels={levels.data.filter((l) => l.collaborator_id === profile.id)} />
      )}
    </Page>
  );
}
