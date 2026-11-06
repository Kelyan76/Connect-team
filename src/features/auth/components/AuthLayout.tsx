import type { ReactNode } from 'react';
import { BrandMark } from '@/shared/ui/brand';

/** Mise en page des écrans d'authentification : formulaire à gauche, panneau d'aide à droite. */
export function AuthLayout({ title, description, children, aside }: { title: string; description?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2">
          <BrandMark className="size-6" />
          <span className="text-md font-semibold">Connect Team</span>
        </div>
        <div className="mx-auto flex w-full max-w-90 flex-1 flex-col justify-center gap-6 py-12">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-base text-fg-muted">{description}</p>}
          </div>
          {children}
          {aside && <div className="border-t border-line pt-6 lg:hidden">{aside}</div>}
        </div>
        <p className="text-xs text-fg-subtle">Connect Team · Pilotage et management d’équipe</p>
      </main>
      {aside && <aside className="hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-16">{aside}</aside>}
    </div>
  );
}
