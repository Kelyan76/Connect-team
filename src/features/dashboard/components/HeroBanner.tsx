import type { ReactNode } from 'react';

/** Bandeau d'accueil en dégradé : salutation, phrase courte et actions principales. */
export function HeroBanner({ title, subtitle, children }: { title: string; subtitle: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-hero-from to-hero-to px-5 py-6 text-white shadow-md sm:px-8 sm:py-8">
      {/* Formes décoratives discrètes. */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 right-24 size-40 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-base text-white/80">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}
