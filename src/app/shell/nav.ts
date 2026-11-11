import {
  Bell,
  Compass,
  HeartPulse,
  KanbanSquare,
  LayoutDashboard,
  MessageSquareText,
  NotebookPen,
  Settings,
  ShieldCheck,
  Trophy,
  Sparkles,
  Target,
  Grid3x3,
  GitFork,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { SectionTone } from './section-colors';

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

// Menu recentré sur les questions du manager et les outils du cours.
// Plan de charge, absences, réunions et rapports restent accessibles par leur adresse, hors menu.
export const NAV: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: both },
      { to: '/alertes', label: 'Signaux faibles', icon: Bell, roles: manager },
    ],
  },
  {
    label: 'Équipe',
    items: [
      { to: '/equipe', label: 'Collaborateurs', icon: Users, roles: manager },
      { to: '/parcours', label: 'Parcours', icon: Trophy, selfLabel: 'Mon parcours', roles: both },
      { to: '/pouls', label: 'Pouls', icon: HeartPulse, selfLabel: 'Mon pouls', roles: both },
      { to: '/leviers', label: 'Leviers DREAM', icon: Sparkles, roles: manager },
      { to: '/competences', label: 'Compétences', icon: Grid3x3, selfLabel: 'Mes compétences', roles: both },
      { to: '/entretiens', label: '1 à 1', icon: MessageSquareText, selfLabel: 'Mes 1 à 1', roles: both },
      { to: '/feedbacks', label: 'Feedbacks', icon: NotebookPen, roles: both },
      { to: '/posture', label: 'Décider', icon: Compass, roles: manager },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { to: '/objectifs', label: 'Objectifs', icon: Target, selfLabel: 'Mes objectifs', roles: both },
      { to: '/delegation', label: 'Délégation', icon: GitFork, roles: both },
      { to: '/taches', label: 'Tâches', icon: KanbanSquare, selfLabel: 'Mes tâches', roles: both },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: '/parametres',
  label: 'Paramètres',
  icon: Settings,
  roles: manager,
};

/** Charte éthique et données : accessible à tous, en bas du menu. */
export const ETHICS_ITEM: NavItem = {
  to: '/ethique',
  label: 'Éthique et données',
  icon: ShieldCheck,
  roles: both,
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

// ─── Sections de la barre latérale ──────────────────────────────────────
// Le menu principal reste court : chaque section regroupe des pages voisines,
// accessibles par des onglets en haut de page. Les adresses des pages ne changent pas.

export interface NavSection {
  label: string;
  selfLabel?: string;
  /** Libellé court de la barre de navigation mobile. */
  shortLabel: string;
  selfShortLabel?: string;
  tone: SectionTone;
  icon: LucideIcon;
  /** Chemins des pages (voir NAV), dans l'ordre des onglets ; libellé d'onglet facultatif. */
  tabs: { to: string; tabLabel?: string }[];
}

export const SECTIONS: NavSection[] = [
  { label: 'Tableau de bord', selfLabel: 'Accueil', shortLabel: 'Accueil', tone: 'home', icon: LayoutDashboard, tabs: [{ to: '/', tabLabel: 'Vue d’ensemble' }, { to: '/alertes' }] },
  { label: 'Équipe', selfLabel: 'Mon suivi', shortLabel: 'Équipe', selfShortLabel: 'Suivi', tone: 'team', icon: Users, tabs: [{ to: '/equipe' }, { to: '/parcours' }, { to: '/pouls' }, { to: '/leviers' }, { to: '/competences' }] },
  { label: '1 à 1 et feedback', selfLabel: 'Mes 1 à 1', shortLabel: '1 à 1', tone: 'reviews', icon: MessageSquareText, tabs: [{ to: '/entretiens' }, { to: '/feedbacks' }, { to: '/posture' }] },
  { label: 'Objectifs', selfLabel: 'Mes objectifs', shortLabel: 'Objectifs', tone: 'goals', icon: Target, tabs: [{ to: '/objectifs' }, { to: '/delegation' }, { to: '/taches' }] },
];

export interface ResolvedSection {
  label: string;
  shortLabel: string;
  tone: SectionTone;
  icon: LucideIcon;
  /** Première page accessible : cible du lien de la section. */
  to: string;
  tabs: { to: string; label: string }[];
}

const ALL_ITEMS = [...NAV.flatMap((g) => g.items), SETTINGS_ITEM, ETHICS_ITEM];

/** Sections visibles pour un rôle (onglets filtrés selon les droits, sections vides retirées). */
export function sectionsForRole(role: Role): ResolvedSection[] {
  return SECTIONS.flatMap((s) => {
    const tabs = s.tabs.flatMap((t) => {
      const item = ALL_ITEMS.find((i) => i.to === t.to);
      if (!item || !item.roles.includes(role)) return [];
      return [{ to: t.to, label: t.tabLabel ?? itemLabel(item, role) }];
    });
    if (tabs.length === 0) return [];
    const self = role === 'collaborateur';
    return [
      {
        label: self && s.selfLabel ? s.selfLabel : s.label,
        shortLabel: self && s.selfShortLabel ? s.selfShortLabel : s.shortLabel,
        tone: s.tone,
        icon: s.icon,
        to: tabs[0].to,
        tabs,
      },
    ];
  });
}

/** Vrai si `pathname` est la page `to` ou l'une de ses sous-pages. */
export const matchesPath = (to: string, pathname: string) =>
  to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

export const sectionForPath = (sections: ResolvedSection[], pathname: string) =>
  sections.find((s) => s.tabs.some((t) => matchesPath(t.to, pathname)));
