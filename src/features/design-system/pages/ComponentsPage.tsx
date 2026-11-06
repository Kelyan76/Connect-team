import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge, StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ProgressBar, Stat, StatGroup } from '@/shared/ui/data';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/ui/dialog';
import { EmptyState, ErrorState, Kbd, Skeleton, TableSkeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { toast } from '@/shared/ui/toaster';
import { Checkbox, Segmented, SegmentedItem, Switch } from '@/shared/ui/toggle';
import { DemoTable } from '../components/DemoTable';
import { TokenSwatches, TypeScale } from '../components/Tokens';

export default function ComponentsPage() {
  const [confirm, setConfirm] = useState(false);
  const [view, setView] = useState('tableau');

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Développement' }, { label: 'Composants' }]}
        title="Système de design"
        description="Référence des tokens et des composants de base. Chaque écran de l'application est construit uniquement avec ces éléments."
        actions={
          <>
            <Button variant="secondary">Exporter</Button>
            <Button variant="primary">
              <Plus aria-hidden />
              Nouvel élément
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <Panel title="Couleurs" description="Neutres ardoise sur 10 nuances, un accent, trois statuts">
          <TokenSwatches />
        </Panel>

        <Panel title="Typographie" description="Inter, échelle 12 / 13 / 14 / 16 / 20 / 24 px">
          <TypeScale />
        </Panel>

        <StatGroup>
          <Stat label="Atteinte des objectifs" value="68 %" delta="4 pts" trend="up" hint="vs trimestre précédent" />
          <Stat label="Charge moyenne" value="91 %" delta="6 pts" trend="up" upIsGood={false} hint="4 dernières semaines" />
          <Stat label="Tâches en retard" value="7" delta="2" trend="down" upIsGood={false} hint="dont 3 urgentes" />
          <Stat label="Entretiens à préparer" value="3" hint="sous 15 jours" />
        </StatGroup>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Boutons">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Enregistrer</Button>
              <Button>Annuler</Button>
              <Button variant="ghost">Plus tard</Button>
              <Button variant="danger">
                <Trash2 aria-hidden />
                Supprimer
              </Button>
              <Button variant="link">Voir le détail</Button>
              <Button size="sm">Petit</Button>
              <Button size="icon" aria-label="Rechercher">
                <Search aria-hidden />
              </Button>
              <Button disabled>Indisponible</Button>
            </div>
          </Panel>

          <Panel title="Statuts">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">En avance</Badge>
                <Badge tone="accent">Dans les temps</Badge>
                <Badge tone="warning">À risque</Badge>
                <Badge tone="danger">En retard</Badge>
                <Badge>Brouillon</Badge>
                <Badge tone="outline">Annuel</Badge>
              </div>
              <div className="flex flex-wrap gap-4">
                <StatusDot tone="success">Prêt</StatusDot>
                <StatusDot tone="warning">Préparé par le collaborateur</StatusDot>
                <StatusDot>À préparer</StatusDot>
              </div>
              <div className="flex flex-col gap-2">
                <ProgressBar value={0.82} tone="success" label="Avancement" />
                <ProgressBar value={0.47} label="Avancement" />
                <ProgressBar value={0.18} tone="danger" label="Avancement" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Formulaire">
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <Field label="Intitulé" hint="Visible par le collaborateur concerné.">
                <Input placeholder="Réduire le délai de mise en service" />
              </Field>
              <Field label="Échéance" error="La date doit être postérieure au début de l'objectif.">
                <Input type="date" defaultValue="2026-12-18" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <NativeSelect defaultValue="individuel">
                    <option value="individuel">Individuel</option>
                    <option value="equipe">Équipe</option>
                  </NativeSelect>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Responsable</span>
                  <Select defaultValue="nadia">
                    <SelectTrigger aria-label="Responsable">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nadia">Nadia Haddad</SelectItem>
                      <SelectItem value="julien">Julien Mercier</SelectItem>
                      <SelectItem value="karim">Karim Benali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Commentaire" optional>
                <Textarea rows={3} />
              </Field>
              <label className="flex items-center gap-2 text-base">
                <Checkbox defaultChecked /> Partager avec le collaborateur
              </label>
              <label className="flex items-center gap-2 text-base">
                <Switch defaultChecked /> Rappel 3 jours avant
              </label>
            </form>
          </Panel>

          <Panel title="Superpositions et retours">
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Ouvrir une fenêtre</Button>
                </DialogTrigger>
                <DialogContent
                  title="Planifier un entretien"
                  description="Le collaborateur sera notifié et pourra préparer sa partie."
                  footer={<Button variant="primary">Planifier</Button>}
                >
                  <Field label="Date et heure">
                    <Input type="datetime-local" />
                  </Field>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setConfirm(true)}>Confirmation</Button>
              <Button onClick={() => toast.success('Objectif enregistré')}>Toast succès</Button>
              <Button onClick={() => toast.error("L'enregistrement a échoué. Réessayez.")}>Toast erreur</Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
              Raccourcis : <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd> palette, <Kbd>N</Kbd> nouvel élément, <Kbd>Échap</Kbd> fermer.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <PersonLabel person={{ first_name: 'Élodie', last_name: 'Fontaine' }} detail="Assistante ADV" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              title="Supprimer cette tâche ?"
              description="La tâche « Relancer le fournisseur de vérins » sera définitivement supprimée."
              confirmLabel="Supprimer"
              onConfirm={() => setConfirm(false)}
            />
          </Panel>
        </div>

        <Tabs defaultValue="donnees">
          <TabsList>
            <TabsTrigger value="donnees">Tableau</TabsTrigger>
            <TabsTrigger value="etats">États</TabsTrigger>
          </TabsList>
          <TabsContent value="donnees">
            <div className="flex justify-end pb-3">
              <Segmented value={view} onValueChange={setView} aria-label="Affichage">
                <SegmentedItem value="tableau">Tableau</SegmentedItem>
                <SegmentedItem value="cartes">Cartes</SegmentedItem>
              </Segmented>
            </div>
            <DemoTable />
          </TabsContent>
          <TabsContent value="etats" className="grid gap-6 lg:grid-cols-3">
            <Panel title="Chargement" flush>
              <TableSkeleton rows={4} columns={3} />
            </Panel>
            <Panel title="Vide" flush>
              <EmptyState
                title="Aucun feedback pour l'instant"
                description="Les feedbacks partagés alimentent automatiquement la préparation des entretiens."
                action={<Button size="sm">Rédiger un feedback</Button>}
              />
            </Panel>
            <Panel title="Erreur" flush>
              <ErrorState error={new Error('Connexion au serveur impossible.')} onRetry={() => undefined} />
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}
