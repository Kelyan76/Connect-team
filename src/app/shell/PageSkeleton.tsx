import { Skeleton } from '@/shared/ui/feedback';
import { Page } from '@/shared/ui/layout';

/** Squelette générique d'une page pendant le chargement de son code. */
export function PageSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-2 pb-5" aria-busy="true" aria-label="Chargement de la page">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="mt-6 h-80" />
    </Page>
  );
}
