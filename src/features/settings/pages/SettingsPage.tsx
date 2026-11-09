import { useCurrentUser } from '@/features/auth/AuthProvider';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BackupPanel } from '../components/BackupPanel';
import { SkillsSettings } from '../components/SkillsSettings';
import { ThresholdsForm } from '../components/ThresholdsForm';

export default function SettingsPage() {
  const { team } = useCurrentUser();
  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: 'Paramètres' }]} title="Paramètres" description={`${team.company} · ${team.name}`} />
      <Tabs defaultValue="seuils">
        <TabsList>
          <TabsTrigger value="seuils">Seuils d’alerte</TabsTrigger>
          <TabsTrigger value="competences">Compétences</TabsTrigger>
          <TabsTrigger value="sauvegarde">Sauvegarde</TabsTrigger>
        </TabsList>
        <TabsContent value="seuils">
          <ThresholdsForm teamId={team.id} />
        </TabsContent>
        <TabsContent value="competences">
          <SkillsSettings />
        </TabsContent>
        <TabsContent value="sauvegarde">
          <BackupPanel />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
