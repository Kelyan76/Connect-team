import { BrandMark } from '@/shared/ui/brand';
import { Skeleton } from '@/shared/ui/feedback';

/** Écran de démarrage : le temps de restaurer la session (et, en démo, d'ouvrir la base locale). */
export function BootScreen() {
  return (
    <div className="flex min-h-screen bg-canvas" aria-busy="true" aria-label="Chargement de Connect Team">
      <div className="hidden w-60 flex-col gap-3 border-r border-line bg-surface p-4 md:flex">
        <div className="flex items-center gap-2 pb-4">
          <BrandMark />
          <Skeleton className="h-3 w-20" />
        </div>
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-32" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
