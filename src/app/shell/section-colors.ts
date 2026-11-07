/**
 * Couleur de chaque section (menu, onglets, barre du bas, halo de page).
 * Classes écrites en entier pour que Tailwind les génère.
 */
export type SectionTone = 'home' | 'team' | 'reviews' | 'goals' | 'planning' | 'meetings' | 'settings';

export const SECTION_COLOR: Record<
  SectionTone,
  { text: string; solid: string; soft: string; wash: string; blob: string; icon: string }
> = {
  home: { text: 'text-sec-home', solid: 'bg-sec-home text-white', soft: 'bg-sec-home/10 text-sec-home', wash: 'from-sec-home/10', blob: 'bg-sec-home/10', icon: 'text-[hsl(234_80%_78%)]' },
  team: { text: 'text-sec-team', solid: 'bg-sec-team text-white', soft: 'bg-sec-team/10 text-sec-team', wash: 'from-sec-team/10', blob: 'bg-sec-team/10', icon: 'text-[hsl(174_60%_62%)]' },
  reviews: { text: 'text-sec-reviews', solid: 'bg-sec-reviews text-white', soft: 'bg-sec-reviews/10 text-sec-reviews', wash: 'from-sec-reviews/10', blob: 'bg-sec-reviews/10', icon: 'text-[hsl(262_80%_80%)]' },
  goals: { text: 'text-sec-goals', solid: 'bg-sec-goals text-white', soft: 'bg-sec-goals/10 text-sec-goals', wash: 'from-sec-goals/10', blob: 'bg-sec-goals/10', icon: 'text-[hsl(152_55%_60%)]' },
  planning: { text: 'text-sec-planning', solid: 'bg-sec-planning text-white', soft: 'bg-sec-planning/10 text-sec-planning', wash: 'from-sec-planning/10', blob: 'bg-sec-planning/10', icon: 'text-[hsl(30_95%_66%)]' },
  meetings: { text: 'text-sec-meetings', solid: 'bg-sec-meetings text-white', soft: 'bg-sec-meetings/10 text-sec-meetings', wash: 'from-sec-meetings/10', blob: 'bg-sec-meetings/10', icon: 'text-[hsl(330_80%_76%)]' },
  settings: { text: 'text-sec-settings', solid: 'bg-sec-settings text-white', soft: 'bg-sec-settings/10 text-sec-settings', wash: 'from-sec-settings/10', blob: 'bg-sec-settings/10', icon: 'text-[hsl(215_20%_72%)]' },
};
