import { useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { matchesPath, sectionForPath, sectionsForRole, type Role } from './nav';
import { SECTION_COLOR, type SectionTone } from './section-colors';

/**
 * Halo coloré derrière le haut de chaque page, dans la couleur de la section :
 * l'application change d'ambiance d'une section à l'autre, sans gêner la lecture.
 */
export function PageHalo({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const tone: SectionTone = matchesPath('/parametres', pathname) || matchesPath('/profil', pathname)
    ? 'settings'
    : (sectionForPath(sectionsForRole(role), pathname)?.tone ?? 'home');
  const color = SECTION_COLOR[tone];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
      <div key={tone} className={cn('absolute inset-0 animate-fade-in bg-gradient-to-b via-transparent to-transparent', color.wash)} />
      <div key={`${tone}-a`} className={cn('absolute -right-24 -top-32 size-96 animate-float-slow rounded-full blur-3xl', color.blob)} />
      <div key={`${tone}-b`} className={cn('absolute -left-16 top-10 size-64 animate-float rounded-full blur-3xl', color.blob)} />
    </div>
  );
}
