import { Page, PageHeader } from '@/shared/ui/layout';
import { DiscQuiz } from '../components/DiscQuiz';

/** Test DISC en 2 minutes, accessible depuis le profil et l'accueil. */
export default function DiscTestPage() {
  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Mon profil', to: '/profil' },
          { label: 'Mon style de communication' },
        ]}
        title="Mon style de communication"
        description="8 situations, environ 2 minutes. Choisissez à chaque fois la phrase qui vous ressemble le plus : il n’y a pas de bonne réponse."
      />
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        <DiscQuiz />
        <p className="text-xs text-fg-subtle">
          Auto-évaluation indicative inspirée du modèle DISC, pour mieux communiquer ensemble. Ce
          n’est ni une évaluation ni un test psychologique.
        </p>
      </div>
    </Page>
  );
}
