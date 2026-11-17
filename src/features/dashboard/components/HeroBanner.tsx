import type { ReactNode } from 'react';

const dayLabel = () => {
  const s = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Bandeau d'accueil en dégradé : salutation, phrase courte et actions principales. */
export function HeroBanner({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-hero-from to-hero-to px-5 py-5 text-white shadow-md sm:px-8 sm:py-8">
      {/* Formes décoratives discrètes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 size-56 animate-float rounded-full bg-white/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-24 size-40 animate-float-slow rounded-full bg-white/10"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="w-fit rounded-full bg-white/15 px-3 py-0.5 text-xs font-medium text-white/90">
            {dayLabel()}
          </span>
          <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          <p className="text-base text-white/80">{subtitle}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}
