import { CalendarClock, CloudSun, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/shared/ui/brand';

/** Aperçus flottants de l'application (décoratifs) sur le panneau de droite. */
function Previews() {
  return (
    <div aria-hidden className="relative mt-10 h-64">
      <div className="absolute left-0 top-0 w-60 animate-[float_9s_ease-in-out_infinite] rounded-lg bg-white/95 p-4 text-fg shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded bg-accent-subtle text-accent">
            <Target className="size-5" />
          </span>
          <div>
            <p className="tabular text-lg font-semibold">78 %</p>
            <p className="text-xs text-fg-subtle">Objectifs atteints</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-[78%] origin-left animate-grow rounded-full bg-accent [animation-delay:600ms]" />
        </div>
      </div>
      <div className="absolute right-0 top-16 w-56 animate-[float-slow_11s_ease-in-out_infinite] rounded-lg bg-white/95 p-4 text-fg shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded bg-warning-subtle text-warning">
            <CalendarClock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Entretien demain</p>
            <p className="text-xs text-fg-subtle">10:00 · préparation prête</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-12 w-52 animate-[float_13s_ease-in-out_infinite] rounded-lg bg-white/95 p-4 text-fg shadow-md [animation-delay:-4s]">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded bg-success-subtle text-success">
            <CloudSun className="size-5" />
          </span>
          <div>
            <p className="tabular text-lg font-semibold">4,2 / 5</p>
            <p className="text-xs text-fg-subtle">Pouls d’équipe</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Écrans d'authentification : formulaire à gauche (apparition en cascade),
 * panneau en dégradé animé à droite sur grand écran, avec l'aide éventuelle (`aside`).
 */
export function AuthLayout({ title, description, children, aside }: { title: string; description?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Fond animé discret, visible surtout sur téléphone. */}
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 animate-float rounded-full bg-hero-from/15 blur-3xl lg:hidden" />
      <span aria-hidden className="pointer-events-none absolute -right-20 top-1/3 size-64 animate-float-slow rounded-full bg-hero-to/15 blur-3xl lg:hidden" />

      <main className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex animate-fade-in items-center gap-2">
          <BrandMark className="size-7" />
          <span className="text-md font-semibold">Connect Team</span>
        </div>
        <div className="stagger mx-auto flex w-full max-w-90 flex-1 flex-col justify-center gap-6 py-12">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && <p className="text-base text-fg-muted">{description}</p>}
          </div>
          <div>{children}</div>
          {aside && <div className="border-t border-line pt-6 lg:hidden">{aside}</div>}
        </div>
        <p className="text-xs text-fg-subtle">Connect Team · Pilotage et management d’équipe</p>
      </main>

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-hero-from to-hero-to text-white lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-12">
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 animate-float rounded-full bg-white/10 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-96 animate-float-slow rounded-full bg-white/10 blur-2xl" />
        <div className="stagger relative flex max-w-110 flex-col">
          <h2 className="text-xl font-semibold leading-tight">Pilotez votre équipe, simplement.</h2>
          <p className="mt-2 text-base text-white/80">Objectifs, entretiens, charge et pouls d’équipe réunis au même endroit.</p>
          {aside ? <div className="mt-8 rounded-lg bg-white p-6 text-fg shadow-md">{aside}</div> : <Previews />}
        </div>
      </aside>
    </div>
  );
}
