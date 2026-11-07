import { BrandMark } from '@/shared/ui/brand';

/** Écran de démarrage : logo animé le temps de restaurer la session (et, en démo, d'ouvrir la base locale). */
export function BootScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas" aria-busy="true" aria-label="Chargement de Connect Team">
      <div className="relative flex size-20 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-accent/20 [animation-duration:1.6s]" />
        <BrandMark className="relative size-14 animate-pop-in" />
      </div>
      <div className="flex animate-page-in flex-col items-center gap-1 [animation-delay:150ms]">
        <span className="text-md font-semibold">Connect Team</span>
        <span className="text-sm text-fg-subtle">Chargement de votre espace…</span>
      </div>
    </div>
  );
}
