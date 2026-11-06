import {
  BarChart3,
  Bell,
  CalendarDays,
  CloudSun,
  FileText,
  Gauge,
  GitFork,
  Grid3x3,
  KanbanSquare,
  LayoutDashboard,
  MessageSquareText,
  NotebookPen,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'manager' | 'collaborateur';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Libellé spécifique à la vue collaborateur. */
  selfLabel?: string;
  roles: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const both: Role[] = ['manager', 'collaborateur'];
const manager: Role[] = ['manager'];

export const NAV: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: both },
      { to: '/alertes', label: 'Alertes', icon: Bell, roles: manager },
      { to: '/rapports', label: 'Rapports', icon: FileText, roles: manager },
    ],
  },
  {
    label: 'Équipe',
    items: [
      { to: '/equipe', label: 'Collaborateurs', icon: Users, roles: manager },
      { to: '/entretiens', label: 'Entretiens', icon: MessageSquareText, selfLabel: 'Mes entretiens', roles: both },
      { to: '/objectifs', label: 'Objectifs', icon: Target, selfLabel: 'Mes objectifs', roles: both },
      { to: '/competences', label: 'Compétences', icon: Grid3x3, selfLabel: 'Mes compétences', roles: both },
      { to: '/feedbacks', label: 'Feedbacks', icon: NotebookPen, roles: both },
      { to: '/meteo', label: 'Météo', icon: CloudSun, selfLabel: 'Ma météo', roles: both },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { to: '/taches', label: 'Tâches', icon: KanbanSquare, selfLabel: 'Mes tâches', roles: both },
      { to: '/plan-de-charge', label: 'Plan de charge', icon: Gauge, selfLabel: 'Ma charge', roles: both },
      { to: '/absences', label: 'Absences', icon: CalendarDays, selfLabel: 'Mes absences', roles: both },
      { to: '/reunions', label: 'Réunions', icon: BarChart3, roles: manager },
      { to: '/delegation', label: 'Délégation', icon: GitFork, roles: both },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: '/parametres',
  label: 'Paramètres',
  icon: Settings,
  roles: manager,
};

const SELF_GROUP_LABEL: Record<string, string> = { Pilotage: 'Mon espace', Équipe: 'Progression' };

export function navForRole(role: Role): NavGroup[] {
  return NAV.map((g) => ({
    label: role === 'collaborateur' ? (SELF_GROUP_LABEL[g.label] ?? g.label) : g.label,
    items: g.items.filter((i) => i.roles.includes(role)),
  })).filter(
    (g) => g.items.length > 0,
  );
}

export const itemLabel = (item: NavItem, role: Role) =>
  role === 'collaborateur' && item.selfLabel ? item.selfLabel : item.label;
