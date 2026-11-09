import { Ban, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { Badge } from '@/shared/ui/badge';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';

interface DataRow {
  data: string;
  why: string;
  who: string;
  collaborator: 'oui' | 'non' | 'partiel';
  detail: string;
}

const DATA: DataRow[] = [
  { data: 'Pouls du jour (humeur, motivation, charge, mot facultatif)', why: 'Repérer tôt une difficulté et ouvrir la conversation', who: 'Le collaborateur et son manager', collaborator: 'oui', detail: 'C’est lui qui le saisit ; il peut ne pas répondre.' },
  { data: 'Objectifs et avancement', why: 'Donner une direction claire (DREAM, SMART)', who: 'Le collaborateur et son manager ; l’équipe pour les objectifs d’équipe', collaborator: 'oui', detail: 'Il propose ses avancements, le manager les valide.' },
  { data: '1 à 1 : préparation, compte-rendu, engagements', why: 'Garder la mémoire des échanges et des engagements réciproques', who: 'Le collaborateur et son manager', collaborator: 'oui', detail: 'Réponses croisées visibles quand les deux ont préparé ; compte-rendu signé à deux.' },
  { data: 'Feedbacks', why: 'Reconnaître et faire progresser (méthode DESC)', who: 'Le manager ; le collaborateur pour ceux qui sont partagés', collaborator: 'partiel', detail: 'Un feedback préparé reste privé jusqu’à ce qu’il soit dit et partagé.' },
  { data: 'Profil DISC', why: 'Adapter la forme de la communication, jamais le fond', who: 'Le collaborateur et son manager', collaborator: 'oui', detail: 'Établi avec lui ; il peut le corriger à tout moment.' },
  { data: 'Compétences', why: 'Accompagner la montée en compétences', who: 'Le collaborateur et son manager', collaborator: 'oui', detail: 'Il s’auto-évalue, le manager valide.' },
  { data: 'Missions déléguées', why: 'Développer l’autonomie avec un cadre clair', who: 'Le collaborateur et son manager', collaborator: 'oui', detail: 'Limites, échéance et points de contrôle connus de tous les deux.' },
  { data: 'Séries et badges du pouls', why: 'Encourager une habitude, sans pression', who: 'Le collaborateur seul', collaborator: 'oui', detail: 'Jamais transmis au manager ; ne pas répondre ne pénalise personne.' },
  { data: 'Avatar', why: 'Se reconnaître d’un coup d’œil, rendre l’outil sympathique', who: 'Les personnes qui voient déjà votre fiche', collaborator: 'oui', detail: 'Choisi par vous, modifiable ou retirable à tout moment.' },
  { data: 'Carnet d’observations', why: 'Préparer des feedbacks factuels et le prochain 1 à 1', who: 'Le manager seul', collaborator: 'non', detail: 'Faits observables uniquement, à reprendre en 1 à 1 : jamais un dossier à charge.' },
  { data: 'Préparation privée du 1 à 1 et journal de décisions', why: 'Choisir sa posture avant d’agir', who: 'Le manager seul', collaborator: 'non', detail: 'Notes de travail du manager, sans jugement sur la personne.' },
];

const REFUSED = [
  'Géolocalisation, horaires de présence, temps passé en ligne ou activité sur le poste',
  'Lecture des messages, courriels ou agendas personnels',
  'Données de santé ou de vie privée (le mot du pouls est facultatif : n’y écrivez rien de médical)',
  'Note globale, score de performance ou classement entre collaborateurs',
  'Consultation par le manager des connexions de son équipe',
  'Analyse des données des collaborateurs par une intelligence artificielle',
];

const RULES = [
  { title: 'Accompagner, pas surveiller', body: 'Un signal faible n’est jamais une sanction : c’est une invitation à prendre des nouvelles en 1 à 1.' },
  { title: 'Des règles simples et expliquées', body: 'Signaux et leviers DREAM sont calculés par des règles lisibles (seuils de pouls, échéances, dates) que chacun peut comprendre.' },
  { title: 'Le collaborateur a la main', body: 'Il voit ce qui le concerne, corrige son profil DISC et son auto-évaluation, prépare ses 1 à 1 et signe les comptes-rendus.' },
  { title: 'Minimiser et effacer', body: 'Ne notez que ce qui sert à l’accompagnement ; supprimez une observation une fois traitée. Nous recommandons de ne pas garder le carnet au-delà de 12 mois.' },
  { title: 'Données fictives pour la démonstration', body: 'L’équipe Nébuleo est entièrement inventée : aucun vrai nom, aucune donnée d’entreprise réelle.' },
];

const VISIBILITY = {
  oui: { label: 'Oui', tone: 'success' as const, icon: Eye },
  partiel: { label: 'En partie', tone: 'warning' as const, icon: Eye },
  non: { label: 'Non', tone: 'neutral' as const, icon: EyeOff },
};

/** Charte éthique et RGPD : quelles données, pourquoi, qui y a accès, ce que voit le collaborateur, ce qui est refusé. */
export default function EthicsPage() {
  const { isManager } = useCurrentUser();
  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Éthique et données' }]}
        title="Éthique et données"
        description="Connect Team est un outil d’accompagnement, pas de surveillance. Voici ce que l’application collecte, pourquoi, et qui y a accès."
      />
      <div className="stagger flex flex-col gap-6">
        <Panel title={isManager ? 'Ce que nous collectons' : 'Ce que l’application sait de vous'} flush>
          <ul className="divide-y divide-line">
            {DATA.map((d) => {
              const v = VISIBILITY[d.collaborator];
              return (
                <li key={d.data} className="grid gap-2 px-4 py-3 md:grid-cols-[1.3fr_1.2fr_1fr_auto] md:items-start md:gap-4">
                  <span className="text-base font-medium">{d.data}</span>
                  <span className="text-sm text-fg-muted">
                    <span className="md:hidden">Pourquoi : </span>
                    {d.why}
                  </span>
                  <span className="text-sm">
                    <span className="text-fg-subtle">Accès : </span>
                    {d.who}
                    <span className="block text-xs text-fg-subtle">{d.detail}</span>
                  </span>
                  <Badge tone={v.tone} className="self-start">
                    <v.icon className="size-3" aria-hidden />
                    Visible par le collaborateur : {v.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Panel>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Ce que nous refusons de collecter">
            <ul className="flex flex-col gap-2">
              {REFUSED.map((r) => (
                <li key={r} className="flex gap-3 text-sm">
                  <Ban className="mt-px size-4 shrink-0 text-danger" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Nos règles">
            <ul className="flex flex-col gap-3">
              {RULES.map((r) => (
                <li key={r.title} className="flex gap-3">
                  <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-sm text-fg-muted">{r.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Vos droits">
          <p className="text-sm text-fg-muted">
            Chaque personne peut consulter les données qui la concernent dans l’application, demander leur correction et leur suppression à son manager ou
            à l’administrateur de l’outil. Un compte désactivé ne peut plus se connecter ; son historique peut être supprimé sur demande.
          </p>
        </Panel>
      </div>
    </Page>
  );
}
